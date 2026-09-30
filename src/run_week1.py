"""Offline contract rehearsal or explicit live Gemini smoke run. Python 3.11+."""
import argparse,base64,datetime,hashlib,json,os,sys,time,urllib.request,urllib.error,uuid
from pathlib import Path
from core import *

def dump(path,value):
    p=ROOT/path;p.parent.mkdir(exist_ok=True,parents=True)
    p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def preflight(rubric_path):
    reasons=[];rubric=None
    if not os.environ.get('GEMINI_API_KEY'): reasons.append('GEMINI_API_KEY is not configured')
    if not os.environ.get('GEMINI_MODEL'): reasons.append('GEMINI_MODEL is not configured; choose an available image-capable model')
    if not rubric_path: reasons.append('Reviewed rubric file is not supplied')
    else:
        try:
            rubric=json.loads(Path(rubric_path).read_text(encoding='utf-8'))
            if rubric.get('status')!='reviewed' or not rubric.get('reviewer') or not rubric.get('version') or not all(rubric.get(k,'').strip() for k in ('task1','task2')): reasons.append('Rubric needs reviewed text for both tasks, version and reviewer')
        except (OSError,ValueError): reasons.append('Cannot read rubric file')
    return reasons,rubric

def live_call(system,payload,schema,image=None):
    parts=[{'type':'text','text':json.dumps(payload,ensure_ascii=False)}]
    if image:
        parts.append({'type':'image','data':base64.b64encode(image.read_bytes()).decode(),'mime_type':'image/png' if image.suffix.lower()=='.png' else 'image/jpeg'})
    request={'model':os.environ['GEMINI_MODEL'],'system_instruction':system,'input':parts,'response_format':{'type':'text','mime_type':'application/json','schema':{k:v for k,v in schema.items() if k!='$schema'}},'generation_config':{'temperature':0,'max_output_tokens':12000}}
    req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',data=json.dumps(request).encode(),headers={'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']})
    started=time.perf_counter()
    try:
        with urllib.request.urlopen(req,timeout=120) as response: raw=json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'API HTTP {exc.code}; response body omitted to avoid leaking input or credentials') from None
    except (urllib.error.URLError,TimeoutError): raise RuntimeError('API network error or timeout; no automatic retry') from None
    text=raw.get('output_text')
    if not text:
        outputs=raw.get('outputs',[])
        text=''.join(x.get('text','') for x in outputs if x.get('type')=='text')
    if not text:
        # Provider versions can expose model output inside steps. Never consume hidden thoughts.
        blocks=[]
        for step in raw.get('steps',[]):
            content=step.get('content',[])
            if isinstance(content,dict): content=[content]
            if step.get('type') in ('model_output','model_response'):
                blocks.extend(x.get('text','') for x in content if x.get('type')=='text')
        text=''.join(blocks)
    if not text: raise RuntimeError('No supported final text output; inspect current provider response format before retry')
    return json.loads(text),{'elapsed_seconds':round(time.perf_counter()-started,3),'usage':raw.get('usage',None),'model':os.environ['GEMINI_MODEL']}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['offline','preflight','live'],default='offline');parser.add_argument('--rubric');parser.add_argument('--sample');args=parser.parse_args()
    samples=read('data/smoke-samples.json')
    if args.sample:
        samples=[s for s in samples if s['id']==args.sample]
        if not samples: parser.error('unknown sample')
    report={'mode':args.mode,'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'prompt_version':'0.2.0','synthetic_inputs':True,'real_ai_calls':0,'results':[]}
    if args.mode in ('preflight','live'):
        reasons,rubric=preflight(args.rubric)
        if reasons:
            report.update(status='blocked',reasons=reasons);dump('results/live-preflight.json',report);print(json.dumps(report,ensure_ascii=False));return 2
        if args.mode=='preflight':
            report.update(status='ready_for_network_attempt',note='Credentials are present, not authenticated');dump('results/live-preflight.json',report);print(json.dumps(report));return 0
    for sample in samples:
        record={'sample_id':sample['id'],'task':sample['task'],'word_count':word_count(sample['essay'])}
        try:
            image=prepare_sample(sample)
            if args.mode=='offline':
                s1,s2=fixture_results(sample);eid=s2['evaluation_id'];record['source']='artificial_contract_fixture_not_a_score'
            else:
                eid=str(uuid.uuid4());payload={'task':sample['task'],'version_id':sample['version_id'],'question':sample['question'],'essay':sample['essay'],'word_count':word_count(sample['essay']),'rubric_context':rubric[f'task{sample["task"]}']}
                report['real_ai_calls']+=1
                s1,usage1=live_call((ROOT/f'prompts/task{sample["task"]}-stage1.md').read_text(),payload,read(f'schemas/task{sample["task"]}-stage1.json'),image)
                validate_stage1(s1,sample)
                record.update(stage1=s1,stage1_usage=usage1,evaluation_id=eid,rubric_version=rubric['version'])
                # Persist Stage 1 before attempting diagnostic analysis.
                dump(f'results/live-{sample["id"]}-{eid}.json',record)
                if s1['assessment_status']!='assessed':
                    record['status']='needs_input';report['results'].append(record);continue
                payload.update(stage1=s1,evaluation_id=eid,indicator_catalog=read(f'prompts/indicator-catalog-task{sample["task"]}.json'))
                report['real_ai_calls']+=1
                s2,usage2=live_call((ROOT/f'prompts/task{sample["task"]}-stage2.md').read_text(),payload,read(f'schemas/task{sample["task"]}-stage2.json'),image);record.update(stage2=s2,stage2_usage=usage2,practice_score=practice_score(s1))
            validate_stage1(s1,sample);validate_stage2(s2,sample,s1,eid)
            record.update(status='contract_pass',indicator_count=len(s2['indicators']))
        except Exception as exc:
            record.update(status='failed',error_type=type(exc).__name__,message=str(exc)[:500])
        report['results'].append(record)
        if args.mode=='live': dump('results/live-smoke.json',report)
    report['status']='passed' if all(x['status']=='contract_pass' for x in report['results']) else 'incomplete'
    report['note']='Contract checks are not evidence of scoring accuracy. Live adapter has not been verified until an actual successful request.'
    dump(f'results/{args.mode}-smoke.json',report);print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['status']=='passed' else 1
if __name__=='__main__': sys.exit(main())
