"""Week 1 technical contracts. This is not a scoring model or production backend."""
from pathlib import Path
import json, math, hashlib
ROOT=Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def word_count(text): return len(text.split())
def codes(task): return ['TA' if task==1 else 'TR','CC','LR','GRA']

class ContractError(ValueError): pass

def validate(value,schema,path='$'):
    """Validate only the schema keywords used by this project, fail on unknown keywords.
    Not a general JSON Schema implementation. Replace with an established validator in web backend.
    """
    supported={'$schema','type','enum','properties','required','additionalProperties','items','minItems','maxItems','minimum','maximum','multipleOf','minLength','maxLength'}
    if set(schema)-supported: raise ContractError(f'{path}: unsupported schema keyword')
    types=schema.get('type',[]); types=[types] if isinstance(types,str) else types
    checks={'null':value is None,'boolean':isinstance(value,bool),'integer':type(value) is int,'number':type(value) in (int,float) and math.isfinite(value),'string':isinstance(value,str),'array':isinstance(value,list),'object':isinstance(value,dict)}
    if types and not any(checks.get(t,False) for t in types): raise ContractError(f'{path}: wrong type')
    if 'enum' in schema and value not in schema['enum']: raise ContractError(f'{path}: invalid enum')
    if isinstance(value,dict):
        for key in schema.get('required',[]):
            if key not in value: raise ContractError(f'{path}: missing {key}')
        props=schema.get('properties',{})
        if schema.get('additionalProperties') is False and set(value)-set(props): raise ContractError(f'{path}: unexpected field')
        for k,v in value.items():
            if k in props: validate(v,props[k],f'{path}.{k}')
    if isinstance(value,list):
        if len(value)<schema.get('minItems',0) or len(value)>schema.get('maxItems',math.inf): raise ContractError(f'{path}: invalid item count')
        for i,v in enumerate(value): validate(v,schema['items'],f'{path}[{i}]')
    if isinstance(value,str) and (len(value)<schema.get('minLength',0) or len(value)>schema.get('maxLength',math.inf)): raise ContractError(f'{path}: invalid text length')
    if type(value) in (int,float):
        if not math.isfinite(value) or value<schema.get('minimum',-math.inf) or value>schema.get('maximum',math.inf): raise ContractError(f'{path}: invalid number')
        if 'multipleOf' in schema and abs(value/schema['multipleOf']-round(value/schema['multipleOf']))>1e-8: raise ContractError(f'{path}: invalid increment')

def prepare_sample(sample):
    if type(sample.get('task')) is not int or sample['task'] not in (1,2): raise ContractError('invalid task')
    if not sample.get('question','').strip(): raise ContractError('missing question')
    if word_count(sample.get('essay',''))<21: raise ContractError('insufficient text under project minimum of 21 words')
    if len(sample['essay'])>30000: raise ContractError('essay too long')
    if not sample.get('version_id'): raise ContractError('missing version')
    image=None
    if sample['task']==1:
        if not sample.get('image'): raise ContractError('missing Task 1 image')
        image=(ROOT/sample['image']).resolve()
        if not image.is_relative_to(ROOT) or image.suffix.lower() not in ('.png','.jpg','.jpeg') or not image.is_file(): raise ContractError('invalid image path')
        if image.stat().st_size>4*1024*1024: raise ContractError('image too large for this harness')
    return image

def exact_quote(quote,essay):
    if quote is not None and (not quote or quote not in essay): raise ContractError('quotation absent from essay')

def validate_stage1(result,sample):
    validate(result,read(f'schemas/task{sample["task"]}-stage1.json'))
    if result['version_id']!=sample['version_id']: raise ContractError('version mismatch')
    if sample['task']==2 and result['visual_status']!='not_applicable': raise ContractError('wrong Task 2 visual status')
    assessed=result['assessment_status']=='assessed'
    if assessed and sample['task']==1 and result['visual_status']!='verified': raise ContractError('unverified visual cannot receive full assessment')
    if not assessed and not result['limitations']: raise ContractError('missing limitation')
    for c in codes(sample['task']):
        item=result['criteria'][c]
        if assessed and item['band'] is None: raise ContractError('missing band')
        if not assessed and item['band'] is not None: raise ContractError('blocked assessment must not emit bands')
        for quote in item['quotes']: exact_quote(quote,sample['essay'])
    return result

def practice_score(stage1):
    if stage1['assessment_status']!='assessed': return None
    mean=sum(item['band'] for item in stage1['criteria'].values())/4
    return {'mean':mean,'display':math.floor(mean*2+0.5)/2,'label':'Điểm tham khảo của bài','policy':'project_equal_mean_half_up_v1_not_official_Writing_result'}

def validate_stage2(result,sample,stage1,evaluation_id):
    validate_stage1(stage1,sample)
    if stage1['assessment_status']!='assessed': raise ContractError('Stage 1 is not assessed')
    validate(result,read(f'schemas/task{sample["task"]}-stage2.json'))
    if result['version_id']!=sample['version_id'] or result['evaluation_id']!=evaluation_id: raise ContractError('evaluation reference mismatch')
    catalog=read(f'prompts/indicator-catalog-task{sample["task"]}.json')
    expected={i['id']:i['criterion'] for i in catalog}
    ids=[i['id'] for i in result['indicators']]
    if len(set(ids))!=len(ids) or set(ids)!=set(expected): raise ContractError('catalog is incomplete or duplicated')
    for item in result['indicators']:
        if expected[item['id']]!=item['criterion']: raise ContractError('indicator criterion mismatch')
        exact_quote(item['quote'],sample['essay'])
        if item['status'] in ('weak','developing') and item['quote'] is None: raise ContractError('weakness needs evidence')
        if item['status'] in ('not_observable','not_applicable') and (item['quote'] is not None or item['severity']!='none'): raise ContractError('unobservable cannot assert an error')
    for item in result['corrections']:
        exact_quote(item['original'],sample['essay'])
        if item['original']==item['corrected']: raise ContractError('correction does not change text')
    for item in result['priorities']: exact_quote(item['quote'],sample['essay'])
    return result

def cache_key(sample,config):
    image=prepare_sample(sample)
    payload={'task':sample['task'],'version_id':sample['version_id'],'essay':sample['essay'],'question':sample['question'],'image_sha256':hashlib.sha256(image.read_bytes()).hexdigest() if image else None,'config':config}
    return hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False).encode()).hexdigest()

def conversation_context(sample,stage1,history,question):
    validate_stage1(stage1,sample)
    if not question.strip(): raise ContractError('empty question')
    for msg in history:
        if msg['version_id']!=sample['version_id']: raise ContractError('mixed conversation versions')
        if msg['role'] not in ('user','assistant'): raise ContractError('invalid history role')
    return {'task':sample['task'],'version_id':sample['version_id'],'question':sample['question'],'essay':sample['essay'],'assessment':stage1,'history':history[-8:],'learner_question':question[:2000]}

def metrics(records):
    valid=[r for r in records if r.get('ai') is not None and r.get('teacher') is not None]
    if not valid: return {'attempted':len(records),'valid':0,'mae':None,'bias':None,'within_0_5':None,'within_1_0':None}
    for r in valid:
        if any(type(r[k]) not in (int,float) or not math.isfinite(r[k]) or not 0<=r[k]<=9 for k in ('ai','teacher')): raise ContractError('invalid metric score')
    errors=[r['ai']-r['teacher'] for r in valid];n=len(errors)
    return {'attempted':len(records),'valid':n,'mae':sum(abs(x) for x in errors)/n,'bias':sum(errors)/n,'within_0_5':sum(abs(x)<=.5 for x in errors)/n,'within_1_0':sum(abs(x)<=1 for x in errors)/n}

def fixture_results(sample):
    """Artificial values solely for contract tests. NEVER a real AI assessment."""
    q=sample['essay'].split('\n')[0]
    first={'task':sample['task'],'version_id':sample['version_id'],'stage':'examiner','assessment_status':'assessed','visual_status':'verified' if sample['task']==1 else 'not_applicable','limitations':['TEST FIXTURE ONLY - NO AI OR TEACHER HAS GRADED THIS ESSAY'],'criteria':{c:{'band':5.0,'summary':'Artificial constant for checking data flow only, not an assessment.','quotes':[q]} for c in codes(sample['task'])}}
    second={'task':sample['task'],'version_id':sample['version_id'],'evaluation_id':'fixture-'+sample['id'],'stage':'diagnostic','overview':'Artificial fixture for technical contract testing only.','indicators':[{'id':i['id'],'criterion':i['criterion'],'status':'not_observable','quote':None,'explanation':'Fixture does not evaluate this indicator.','severity':'none','confidence':'low'} for i in read(f'prompts/indicator-catalog-task{sample["task"]}.json')],'corrections':[],'priorities':[]}
    return first,second
