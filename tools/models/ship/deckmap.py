# deckmap.py: floors and walls of the cruise ship on a 1 m grid (ship frame, x -34..34, z -220..220) -> assets/models/ship/cruise_deck.bin
# format: header (u16 W, u16 H, f32 x0, f32 z0, f32 cell), then per cell: u8 nFloors, u16 heights (y*20 + 400), u8 nWalls, pairs u16 (y0*20+400, y1*20+400)
import numpy as np,struct,sys
P=np.fromfile('dump/pos.f32',np.float32).reshape(-1,3,3);Z=np.fromfile('dump/size.f32',np.float32)
x0,z0,cell=-36.,-222.,1.0;W,H=72,444
floors=[[] for _ in range(W*H)];walls=[[] for _ in range(W*H)]
e1=P[:,1]-P[:,0];e2=P[:,2]-P[:,0];n=np.cross(e1,e2);ln=np.linalg.norm(n,axis=1)+1e-9;n=n/ln[:,None];area=ln/2
fl=np.where((n[:,1]>.8)&(area>.15)&(Z>=1.5))[0]      # upward faces (floors, decks)
wl=np.where((np.abs(n[:,1])<.35)&(area>.3)&(Z>=2.5))[0]  # vertical faces (walls, rails)
print('floor tris',len(fl),'wall tris',len(wl))
def cells(t):
    mn=t.min(0);mx=t.max(0);return int((mn[0]-x0)//cell),int((mx[0]-x0)//cell),int((mn[2]-z0)//cell),int((mx[2]-z0)//cell)
for i in fl:
    t=P[i];ymid=t[:,1].mean();a,b,c,d=cells(t)
    # sample the triangle at cell centres (barycentric test)
    for cx in range(max(0,a),min(W-1,b)+1):
        for cz in range(max(0,c),min(H-1,d)+1):
            px=x0+(cx+.5)*cell;pz=z0+(cz+.5)*cell
            v0=t[1][[0,2]]-t[0][[0,2]];v1=t[2][[0,2]]-t[0][[0,2]];v2=np.array([px,pz])-t[0][[0,2]]
            den=v0[0]*v1[1]-v1[0]*v0[1]
            if abs(den)<1e-9:continue
            u=(v2[0]*v1[1]-v1[0]*v2[1])/den;v=(v0[0]*v2[1]-v2[0]*v0[1])/den
            if u>=-.05 and v>=-.05 and u+v<=1.1:
                y=t[0][1]+u*(t[1][1]-t[0][1])+v*(t[2][1]-t[0][1]);floors[cx+cz*W].append(round(y*10))
for i in wl:
    t=P[i];a,b,c,d=cells(t);y0=t[:,1].min();y1=t[:,1].max()
    if y1-y0<.6:continue
    for cx in range(max(0,a),min(W-1,b)+1):
        for cz in range(max(0,c),min(H-1,d)+1):walls[cx+cz*W].append((round(y0*10),round(y1*10)))
out=bytearray(struct.pack('<HHfff',W,H,x0,z0,cell));cnt=0;wcnt=0
def merge(vs,gap):
    vs=sorted(set(vs));r=[]
    for v in vs:
        if r and v-r[-1][-1]<=gap:r[-1].append(v)
        else:r.append([v])
    return [round(sum(g)/len(g)) for g in r]
def mergeiv(iv):
    iv=sorted(iv);r=[]
    for a,b in iv:
        if r and a<=r[-1][1]+3:r[-1][1]=max(r[-1][1],b)
        else:r.append([a,b])
    return r
for k in range(W*H):
    f=merge(floors[k],3)[:14];w=mergeiv(walls[k])[:20];cnt+=len(f);wcnt+=len(w)
    out+=struct.pack('<B',len(f))+b''.join(struct.pack('<H',min(65535,max(0,int(v*2+400)))) for v in f)  # v in .1 m -> *2 = .05 m units
    out+=struct.pack('<B',len(w))+b''.join(struct.pack('<HH',min(65535,max(0,int(a*2+400))),min(65535,max(0,int(b*2+400)))) for a,b in w)
open(sys.argv[1],'wb').write(out);print('floors',cnt,'walls',wcnt,'KB',len(out)//1024)
