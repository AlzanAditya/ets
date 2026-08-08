import React, {useState} from 'react';
import Form from './components/Form';
import Preview from './components/Preview';
import {initialReport} from './data/template';
import './styles/app.css';

const STEP_COUNT = 5;

export default function App(){
  const [data,setData]=useState(initialReport);
  const [step,setStep]=useState(0);

  const goPreview = () => document.getElementById('report-preview')?.scrollIntoView({behavior:'smooth', block:'start'});
  const goForm = () => document.querySelector('.builder')?.scrollIntoView({behavior:'smooth', block:'start'});
  const previous = () => { setStep(s => Math.max(0, s - 1)); goForm(); };
  const next = () => { setStep(s => Math.min(STEP_COUNT - 1, s + 1)); goForm(); };

  return <div className="app">
    <header><div><span className="eyebrow">ETS • REPORT BUILDER <b className="build-chip">v2.5.0</b></span><h1>{data.reportType==='final'?'Final Survey':'Survey'}</h1><p>Form bertahap • live preview • bitmap export • fullscreen zoom • 2-column preview.</p></div><div className="status"><span>Draft</span><b>Dark UI</b><b>Bitmap 2.5×</b><b>Preview 2 kolom</b></div></header>
    <main>
      <Form data={data} setData={setData} step={step} setStep={setStep}/>
      <Preview data={data}/>
    </main>
    <div className="floating-form-nav" aria-label="Navigasi report builder">
      <button className="float-preview" onClick={goPreview}><span>▣</span> Preview</button>
      <div className="float-right">
        <button onClick={previous} disabled={step===0}>← Previous</button>
        <button onClick={next} disabled={step===STEP_COUNT-1}>Next →</button>
      </div>
    </div>
  </div>
}
