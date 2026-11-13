import sys,math
from PIL import Image,ImageDraw
img,d,hh,t,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),sys.argv[5]
x0,x1,y0,y1=[float(v) for v in sys.argv[6:10]]
im=Image.open(img).convert('RGB');W,H=im.size;dr=ImageDraw.Draw(im)
P=(0,hh,d);T=(0,t,0)
f=[T[i]-P[i] for i in range(3)];l=math.sqrt(sum(v*v for v in f));f=[v/l for v in f]
r=[f[1]*0-f[2]*1,f[2]*0-f[0]*0,f[0]*1-f[1]*0]  # f x up(0,1,0)
rl=math.sqrt(sum(v*v for v in r));r=[v/rl for v in r]
u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]]
fov=math.radians(35);k=1/math.tan(fov/2)
def proj(x,y,z=0):
    v=[x-P[0],y-P[1],z-P[2]];cx=sum(v[i]*r[i] for i in range(3));cy=sum(v[i]*u[i] for i in range(3));cz=sum(v[i]*f[i] for i in range(3))
    return (W/2+cx/cz*k*H/2, H/2-cy/cz*k*H/2)
step=0.1
x=math.ceil(x0/step)*step
while x<=x1:
    a=proj(x,y0);b=proj(x,y1);dr.line([a,b],fill=(255,0,0) if abs(x)<1e-6 else (255,120,120),width=1)
    if round(x*10)%2==0:dr.text((a[0]+2,a[1]-12),'%.1f'%x,fill=(255,0,0))
    x+=step
y=math.ceil(y0/step)*step
while y<=y1:
    a=proj(x0,y);b=proj(x1,y);dr.line([a,b],fill=(0,0,255),width=1)
    if round(y*10)%2==0:dr.text((a[0]+2,a[1]+2),'%.1f'%y,fill=(0,0,255))
    y+=step
im.save(out)
