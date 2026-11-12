import json, sys, numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
sys.path.insert(0,'.'); import nolik_joints as NJ
src=sys.argv[1]; out=sys.argv[2]
d=json.load(open(src)); P=np.array(d['pos']).reshape(-1,3); idx=np.array(d['idx']).reshape(-1,3); n=len(P)
# graph over mesh edges, weighted by length. Vertices are split at texture seams, so connect them through their POSITION (identical positions = one node)
key=np.round(P*1e5).astype(np.int64); _,uid=np.unique(key,axis=0,return_inverse=True); uid=uid.ravel(); nu=uid.max()+1
e=np.concatenate([idx[:,[0,1]],idx[:,[1,2]],idx[:,[2,0]]]); w=np.linalg.norm(P[e[:,0]]-P[e[:,1]],axis=1)
a_,b_=uid[e[:,0]],uid[e[:,1]]
G=coo_matrix((np.concatenate([w,w]),(np.concatenate([a_,b_]),np.concatenate([b_,a_]))),shape=(nu,nu)).tocsr()
Pu=np.zeros((nu,3)); Pu[uid]=P
def seg_dist(P,a,b):
    a=np.array(a);b=np.array(b);ab=b-a;t=np.clip(((P-a)@ab)/max(ab@ab,1e-12),0,1);return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
names=[b[0] for b in NJ.BONES]; D=np.zeros((len(names),n))
for k,(nm,par,j,t) in enumerate(NJ.BONES):
    sd=seg_dist(P,j,t)
    if nm=='Head': anchors=np.where(P[:,1]>0.372)[0]
    else:
        # the surface layer nearest to the segment (its own skin), within the segment's extent
        a=np.array(j);b=np.array(t);ab=b-a;tt=((P-a)@ab)/max(ab@ab,1e-12)
        ok=(tt>-0.15)&(tt<1.15)
        cand=np.where(ok)[0] if ok.sum()>8 else np.arange(n)
        m0=sd[cand].min();anchors=cand[sd[cand]<m0*1.15+0.004]
    dist=dijkstra(G,directed=False,indices=np.unique(uid[anchors]),min_only=True)[uid]
    D[k]=dist+0.8*sd      # a little Euclidean pull so detached bits (hair spikes) follow the nearest bone
D=np.where(np.isfinite(D),D,1e3)
# weights: inverse-distance power, then top 4
W=1.0/(D+0.004)**3
# arms hug the torso, so geodesic distances cannot tell them apart: everything outside the torso core (|dx| > 5.6 cm) between the wrist and the shoulder belongs to the arm chain
def sstep(a_,b_,x): t=np.clip((x-a_)/(b_-a_),0,1); return t*t*(3-2*t)
Wn=W/W.sum(0,keepdims=True)
xc=NJ.xc
for s,sg in (('l',1),('r',-1)):
    band=np.where((sg*(P[:,0]-xc)>0.030)&(P[:,1]>0.145)&(P[:,1]<0.305))[0]
    y=P[band,1]; f=sstep(0.030,0.058,sg*(P[band,0]-xc))     # soft inner edge: the arm's inner half is fused to the torso, so a hard cut would tear it
    t_up=sstep(0.20,0.225,y); t_cl=sstep(0.283,0.300,y); t_lo=sstep(0.145,0.165,y)
    w_cl=t_cl; w_up=(1-t_cl)*t_up; w_lo=(1-t_cl)*(1-t_up)*t_lo; w_hand=(1-t_cl)*(1-t_up)*(1-t_lo)
    for nm,wv in (('clavicle_'+s,w_cl),('upperarm_'+s,w_up),('lowerarm_'+s,w_lo),('hand_'+s,w_hand)):
        pass
    old=Wn[:,band].copy(); Wn[:,band]=old*(1-f)
    for nm,wv in (('clavicle_'+s,w_cl),('upperarm_'+s,w_up),('lowerarm_'+s,w_lo),('hand_'+s,w_hand)):
        Wn[names.index(nm),band]+=wv*f
W=Wn
# normalise, then smooth over the surface (neighbour averaging on the position graph) so the regions do not speckle
Wn=W/W.sum(0,keepdims=True)
from scipy.sparse import diags
A=G.copy(); A.data[:]=1.0; deg=np.asarray(A.sum(1)).ravel(); An=diags(1.0/np.maximum(deg,1))@A
Wu=np.zeros((len(names),nu))
for k in range(len(names)): Wu[k,uid]=Wn[k]     # per unique node (identical positions share their weights)
for it in range(10): Wu=0.5*Wu+0.5*(An@Wu.T).T
W=Wu[:,uid]
order=np.argsort(-W,axis=0)[:4]            # (4,n)
J=order.T.copy(); Wt=np.take_along_axis(W,order,axis=0).T
# keep only bones that matter (>12 % of the best), normalise
Wt[Wt<Wt[:,[0]]*0.12]=0; Wt/=Wt.sum(1,keepdims=True)
# the head is rigid: everything above the chin is 100 % head, blended into the neck over 2 cm
head=names.index('Head'); neck=names.index('neck_01')
for i in range(n):
    y=P[i,1]
    if y>0.372: J[i]=[head,0,0,0];Wt[i]=[1,0,0,0]
    elif y>0.352:
        t=(y-0.352)/0.02;J[i]=[head,neck,0,0];Wt[i]=[t,1-t,0,0]
json.dump({'names':names,'J':J.tolist(),'W':Wt.tolist(),'bones':[[b[0],b[1],list(b[2])] for b in NJ.BONES]},open(out,'w'))
# debug: dominant bone histogram
dom=np.bincount(J[:,0],minlength=len(names)); print({names[i]:int(dom[i]) for i in range(len(names))})
