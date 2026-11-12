# bone layout (model space after the rotation: faces +z, +x = its left); each bone = (parent, joint position, tail position used for the skin weights)
xc=-0.013; zc=0.035
def L(name,parent,j,t): return (name,parent,j,t)
BONES=[
 ('pelvis',None,(xc,.14,zc),(xc,.16,zc)),
 ('spine_01','pelvis',(xc,.175,zc),(xc,.20,zc)),
 ('spine_02','spine_01',(xc,.225,zc),(xc,.25,zc)),
 ('spine_03','spine_02',(xc,.272,zc),(xc,.30,zc)),
 ('neck_01','spine_03',(xc,.312,zc),(xc,.352,zc)),
 ('Head','neck_01',(xc,.352,zc),(xc,.65,zc)),
]
for s,sg in (('l',1),('r',-1)):
    def X(o): return xc+sg*o
    BONES+= [
     ('clavicle_'+s,'spine_03',(X(.02),.288,zc),(X(.055),.285,zc)),
     ('upperarm_'+s,'clavicle_'+s,(X(.055),.285,zc),(X(.062),.21,zc)),
     ('lowerarm_'+s,'upperarm_'+s,(X(.062),.21,zc),(X(.075),.15,zc+.005)),
     ('hand_'+s,'lowerarm_'+s,(X(.075),.15,zc+.005),(X(.105),.095,zc+.015)),
     ('thigh_'+s,'pelvis',(X(.04),.13,zc),(X(.045),.075,zc)),
     ('calf_'+s,'thigh_'+s,(X(.045),.075,zc),(X(.05),.035,zc)),
     ('foot_'+s,'calf_'+s,(X(.05),.035,zc),(X(.05),.015,zc+.03)),
     ('ball_'+s,'foot_'+s,(X(.05),.012,zc+.04),(X(.05),.01,zc+.12)),
    ]
