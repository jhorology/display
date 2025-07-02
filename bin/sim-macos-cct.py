import numpy as np

from colour import MSDS_CMFS, SPECTRAL_SHAPE_DEFAULT,xy_to_UCS_uv
from colour.temperature import uv_to_CCT, uv_to_CCT_Robertson1968, uv_to_CCT_Krystek1985, uv_to_CCT_Ohno2013, xy_to_CCT_McCamy1992, xy_to_CCT_Hernandez1999, xy_to_CCT_Kang2002
# cmfs = (
#     MSDS_CMFS["CIE 1931 2 Degree Standard Observer"]
#     .copy()
#     .align(SPECTRAL_SHAPE_DEFAULT)
# )

cct_xyz = [
    (5000, [0.964172363281, 1, 0.8252105712]),
    (6000, [0.952575683594, 1, 1.009185791016]),
    (6500, [0.950439453125, 1, 1.088836669922]),
    (7000, [0.949645996094, 1, 1.160858154297]),
    (8000, xyz: [0.95036315918, 1, 1.285140991211] },
 9000, xyz: [0.952545166016, 1, 1.38703918457] },
 9300, xyz: [0.953323364258, 1, 1.414001464844] }
]

xy = np.array([0.3125, 0.3291015625])
uv = xy_to_UCS_uv(xy)
print('\nxy:', xy, 'uv:', uv, 'CCT should be: 6509\n')

cct = uv_to_CCT(uv)
print('uv_to_CCT', cct)
cct = uv_to_CCT_Robertson1968(uv)
print('uv_to_CCT_Robertson1968', cct)
cct = uv_to_CCT_Krystek1985(uv)
print('uv_to_CCT_Krystek1985', cct)
cct = uv_to_CCT_Ohno2013(uv)
print('uv_to_CCT_Ohno2013', cct)
cct = xy_to_CCT_McCamy1992(xy)
print('xy_to_CCT_McCamy1992', cct)
cct = xy_to_CCT_Hernandez1999(xy)
print('xy_to_CCT_Hernandez1999', cct)
cct = xy_to_CCT_Kang2002(xy)
print('xy_to_CCT_Kang2002', cct)


xy = np.array([ 0.3134765625, 0.3291015625 ])
uv = xy_to_UCS_uv(xy)
print('\nxy:', xy, 'uv:', uv, 'CCT should be: 6479\n')

cct = uv_to_CCT(uv)
print('uv_to_CCT', cct)
cct = uv_to_CCT_Robertson1968(uv)
print('uv_to_CCT_Robertson1968', cct)
cct = uv_to_CCT_Krystek1985(uv)
print('uv_to_CCT_Krystek1985', cct)
cct = uv_to_CCT_Ohno2013(uv)
print('uv_to_CCT_Ohno2013', cct)
cct = xy_to_CCT_McCamy1992(xy)
print('xy_to_CCT_McCamy1992', cct)
cct = xy_to_CCT_Hernandez1999(xy)
print('xy_to_CCT_Hernandez1999', cct)
cct = xy_to_CCT_Kang2002(xy)
print('xy_to_CCT_Kang2002', cct)
