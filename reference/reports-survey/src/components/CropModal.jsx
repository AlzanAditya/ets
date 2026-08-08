import React, {useEffect, useRef, useState} from 'react';

export default function CropModal({src,onClose,onSave,ratio=3/4}){
 const canvasRef=useRef(null), imgRef=useRef(null); const [zoom,setZoom]=useState(1); const [pos,setPos]=useState({x:0,y:0}); const [drag,setDrag]=useState(null);
 useEffect(()=>{const im=new Image(); im.onload=()=>{imgRef.current=im; draw()}; im.src=src;},[src]);
 useEffect(()=>draw(),[zoom,pos]);
 function draw(){const c=canvasRef.current,im=imgRef.current;if(!c||!im)return;const W=480,H=Math.round(W/ratio);c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,W,H);const scale=Math.max(W/im.width,H/im.height)*zoom;const w=im.width*scale,h=im.height*scale;ctx.drawImage(im,(W-w)/2+pos.x,(H-h)/2+pos.y,w,h);}
 function pointerDown(e){setDrag({x:e.clientX-pos.x,y:e.clientY-pos.y});}
 function pointerMove(e){if(!drag)return;setPos({x:e.clientX-drag.x,y:e.clientY-drag.y});}
 function save(){const c=canvasRef.current;onSave(c.toDataURL('image/jpeg',.92));}
 return <div className="modal"><div className="crop-card"><div className="crop-head"><b>Crop foto</b><button onClick={onClose}>×</button></div><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>setDrag(null)} onPointerLeave={()=>setDrag(null)}/><label>Zoom <input type="range" min="1" max="3" step=".01" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label><div className="crop-actions"><button onClick={()=>{setZoom(1);setPos({x:0,y:0})}}>Reset</button><button className="primary" onClick={save}>Gunakan Foto</button></div></div></div>
}
