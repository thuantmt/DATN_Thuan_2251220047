import unittest,sys,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from core import *

class Contracts(unittest.TestCase):
    def setUp(self):
        self.s=read('data/smoke-samples.json')[0]; self.a,self.b=fixture_results(self.s)
    def test_all_six_inputs_and_stages(self):
        for s in read('data/smoke-samples.json'):
            prepare_sample(s);a,b=fixture_results(s);validate_stage1(a,s);validate_stage2(b,s,a,b['evaluation_id'])
    def test_missing_task1_image(self):
        self.s['image']=None
        with self.assertRaises(ContractError):prepare_sample(self.s)
    def test_invalid_task(self):
        self.s['task']=True
        with self.assertRaises(ContractError):prepare_sample(self.s)
    def test_short_input(self):
        self.s['essay']='Too short.'
        with self.assertRaises(ContractError):prepare_sample(self.s)
    def test_empty_question(self):
        self.s['question']=' '
        with self.assertRaises(ContractError):prepare_sample(self.s)
    def test_path_traversal(self):
        self.s['image']='../../../../etc/passwd'
        with self.assertRaises(ContractError):prepare_sample(self.s)
    def test_band_range(self):
        self.a['criteria']['TA']['band']=10
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_band_increment(self):
        self.a['criteria']['TA']['band']=6.2
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_boolean_band(self):
        self.a['criteria']['TA']['band']=True
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_criterion_mismatch(self):
        self.a['criteria']['TR']=self.a['criteria'].pop('TA')
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_absent_quote(self):
        self.a['criteria']['TA']['quotes']=['This sentence does not exist.']
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_uncertain_visual(self):
        self.a['visual_status']='uncertain'
        with self.assertRaises(ContractError):validate_stage1(self.a,self.s)
    def test_needs_input_with_null_scores(self):
        self.a['assessment_status']='needs_input';self.a['visual_status']='uncertain'
        for v in self.a['criteria'].values():v['band']=None
        validate_stage1(self.a,self.s)
        self.assertIsNone(practice_score(self.a))
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_duplicate_indicator(self):
        self.b['indicators'][1]=copy.deepcopy(self.b['indicators'][0])
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_indicator_wrong_group(self):
        self.b['indicators'][0]['criterion']='CC'
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_stage2_cannot_add_score(self):
        self.b['overall']=9
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_wrong_version(self):
        self.b['version_id']='another-version'
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_wrong_evaluation(self):
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,'wrong-id')
    def test_weak_without_evidence(self):
        self.b['indicators'][0]['status']='weak'
        with self.assertRaises(ContractError):validate_stage2(self.b,self.s,self.a,self.b['evaluation_id'])
    def test_mixed_chat_versions(self):
        with self.assertRaises(ContractError):conversation_context(self.s,self.a,[{'version_id':'other','role':'user','content':'why?'}],'Explain')
    def test_chat_history_limit(self):
        h=[{'version_id':self.s['version_id'],'role':'user','content':str(i)} for i in range(20)]
        self.assertEqual(len(conversation_context(self.s,self.a,h,'Why?')['history']),8)
    def test_cache_invalidates_with_prompt(self):
        self.assertNotEqual(cache_key(self.s,{'prompt':'v1'}),cache_key(self.s,{'prompt':'v2'}))
    def test_cache_invalidates_with_question(self):
        k=cache_key(self.s,{});self.s['question']+=' Revised.';self.assertNotEqual(k,cache_key(self.s,{}))
    def test_practice_rounding(self):
        for c,v in zip(codes(1),[6,6,6,7]):self.a['criteria'][c]['band']=v
        self.assertEqual(practice_score(self.a)['display'],6.5)
    def test_metric_known_example_and_missing(self):
        r=metrics([{'ai':6.5,'teacher':6},{'ai':5,'teacher':6},{'ai':None,'teacher':7}])
        self.assertEqual(r['valid'],2);self.assertEqual(r['mae'],.75);self.assertEqual(r['bias'],-.25);self.assertEqual(r['within_0_5'],.5)
    def test_no_labelled_data_has_no_accuracy(self):
        self.assertIsNone(metrics([])['mae'])

if __name__=='__main__':unittest.main(verbosity=2)
