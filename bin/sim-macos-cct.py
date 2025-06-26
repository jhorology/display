import numpy as np

from colour import MSDS_CMFS, SPECTRAL_SHAPE_DEFAULT,xy_to_UCS_uv
from colour.temperature import uv_to_CCT, uv_to_CCT_Robertson1968, uv_to_CCT_Krystek1985, uv_to_CCT_Ohno2013, xy_to_CCT_McCamy1992, xy_to_CCT_Hernandez1999, xy_to_CCT_Kang2002
# cmfs = (
#     MSDS_CMFS["CIE 1931 2 Degree Standard Observer"]
#     .copy()
#     .align(SPECTRAL_SHAPE_DEFAULT)
# )

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
