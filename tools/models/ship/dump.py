# dump the cruise ship as a triangle soup: world metres, Y up, bottom of the hull at y=0, centred on x and z; per-triangle colour (materials baked to vertex colours) and glass flag
from collada import Collada
from collada.common import DaeUnsupportedError,DaeBrokenRefError
import numpy as np,os,json
from PIL import Image
m=Collada('model.dae',ignore=[DaeUnsupportedError,DaeBrokenRefError]);S=.0254
cache={}
def colour(mt):
    if mt is None:return (200,200,200),False
    if mt.id in cache:return cache[mt.id]
    e=mt.effect;d=e.diffuse;c=None;glass=False
    if hasattr(d,'sampler'):
        try:
            p=d.sampler.surface.image.path;p=os.path.join('model',os.path.basename(p))
            im=Image.open(p).convert('RGBA');a=np.asarray(im.resize((8,8),Image.BOX)).reshape(-1,4).mean(0);c=tuple(int(x) for x in a[:3]);glass=a[3]<200
        except Exception as ex:c=(180,180,180)
    elif isinstance(d,tuple):c=tuple(int(x*255) for x in d[:3]);glass=d[3]<.95
    elif isinstance(e.transparent,tuple):c=tuple(int(x*255) for x in e.transparent[:3])
    else:c=(200,200,200)
    if e.transparency is not None and e.transparency<.95:glass=True
    cache[mt.id]=(c,glass);return cache[mt.id]
P=[];C=[];G=[];Z=[]
for bg in m.scene.objects('geometry'):
    for bp in bg.primitives():
        c,gl=colour(bp.material)
        if not hasattr(bp,'vertex_index') or bp.vertex_index.ndim!=2:
            try:bp=bp.triangleset()
            except Exception:continue
        if bp.vertex_index.ndim!=2 or bp.vertex_index.shape[1]!=3:
            continue
        v=(bp.vertex[bp.vertex_index]*S).reshape(-1,3)
        n=len(v)//3
        ext=(v.max(0)-v.min(0));flat=(ext.max()>40 and ext[2]<0.4 and v[:,2].max()<12*1/S*S+0 and v[:,2].max()<14);Z.append(np.full(n,-1.0 if flat else float(ext.max()),np.float32));P.append(v.astype(np.float32));C.append(np.tile(np.array(c,np.uint8),(n*3,1)));G.append(np.full(n,gl,np.uint8))
Z=np.concatenate(Z);P=np.concatenate(P);C=np.concatenate(C);G=np.concatenate(G)
# Z-up -> Y-up by swapping y and z (a mirror: flip the winding), clip the stray points
P=P[:,[0,2,1]].copy();tri=P.reshape(-1,3,3);tri[:,[1,2]]=tri[:,[2,1]];P=tri.reshape(-1,3)
Ct=C.reshape(-1,3,3);Ct[:,[1,2]]=Ct[:,[2,1]];C=Ct.reshape(-1,3)
keep=(tri[:,:,2].max(1)<445)
P=tri[keep].reshape(-1,3);C=Ct[keep].reshape(-1,3);G=G[keep];Z=Z[keep]
P[:,0]-=34;P[:,1]-=6;P[:,2]-=220
print('tris',len(G),'glass',int(G.sum()),'bbox',P.min(0).round(1),P.max(0).round(1))
os.makedirs('../dump',exist_ok=True)
Z.astype(np.float32).tofile('../dump/size.f32');import collections;print('size hist',[(t,int((Z>=t).sum())) for t in (0.3,0.6,1,2,4,8,16)]);P.tofile('../dump/pos.f32');C.tofile('../dump/col.u8');G.tofile('../dump/glass.u8');json.dump({'tris':int(len(G))},open('../dump/hdr.json','w'))
