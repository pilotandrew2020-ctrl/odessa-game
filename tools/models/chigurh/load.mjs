import fs from 'fs';
export function loadGlb(p){const b=fs.readFileSync(p),jl=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+jl)),bo=20+jl+8;
  const pr=j.meshes[0].primitives[0],acc=(i)=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3}[a.type];const off=bo+(v.byteOffset||0)+(a.byteOffset||0);
    const T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];const out=new T(a.count*n);for(let i2=0;i2<out.length;i2++)out[i2]=new DataView(b.buffer,b.byteOffset).getFloat32?0:0;return {a,v,off,T,n}};
  const rd=(i)=>{const {a,off,T,n}=acc(i);const buf=Buffer.from(b.slice(off,off+a.count*n*T.BYTES_PER_ELEMENT));const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length);return new T(ab)};
  return {pos:rd(pr.attributes.POSITION),idx:rd(pr.indices),nrm:pr.attributes.NORMAL!==undefined?rd(pr.attributes.NORMAL):null,j}}
