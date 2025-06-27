const math = require('mathjs'),
  {
    distanceFromPointToPoint,
    distanceFromPointToLine,
    quadraticInterpolation,
    lineFromSlopeAndPoint,
    lineIntersection,
    angleFromSlope
  } = require('./math.js')

/**
 * JIS Standard Z8725/2015 Table B.1
 * Chromaticity coordinates of the blackbody (radiation) locus and the slope
 * of the isochromic temperature line in the 2-degree visual field CIE 1960 UCS
 * coordinate diagram
 *
 *     table step: reciprocal temperature, T = 100,000/index
 *   u,v: CIE 1960 UCS UV cordinates on blackbody locus
 *     rs: Reciprocal of the slope of the isotherm, slope of isotherm is 1/rs,
 *         normal vector of isotherm towords high temperature is (-1, rs)
 *
 * license: PDL 1.0 https://www.digital.go.jp/resources/open_data/public_data_license_v1.0
 */
const JIS_Z8725_UVT = [
  { u: 0.180046, v: 0.263577, rs: -4.09562 },
  { u: 0.180638, v: 0.265948, rs: -3.9133 }, // CCT=100,000K
  { u: 0.181309, v: 0.268506, rs: -3.71055 },
  { u: 0.182067, v: 0.271236, rs: -3.49518 },
  { u: 0.182919, v: 0.274118, rs: -3.2742 },
  { u: 0.183872, v: 0.277131, rs: -3.05386 },
  { u: 0.184932, v: 0.280251, rs: -2.8389 },
  { u: 0.186103, v: 0.283452, rs: -2.63279 },
  { u: 0.187389, v: 0.286709, rs: -2.43778 },
  { u: 0.188792, v: 0.289997, rs: -2.25517 },

  { u: 0.190312, v: 0.293293, rs: -2.08544 }, // CCT=10,000K
  { u: 0.191949, v: 0.296575, rs: -1.92856 },
  { u: 0.193701, v: 0.299825, rs: -1.78409 },
  { u: 0.195566, v: 0.303025, rs: -1.65136 },
  { u: 0.19754, v: 0.306162, rs: -1.52956 },
  { u: 0.199619, v: 0.309223, rs: -1.41784 },
  { u: 0.201799, v: 0.312199, rs: -1.31534 },
  { u: 0.204074, v: 0.315083, rs: -1.22121 },
  { u: 0.20644, v: 0.317868, rs: -1.13468 },
  { u: 0.208891, v: 0.32055, rs: -1.05503 },

  { u: 0.211423, v: 0.323126, rs: -0.98159 }, // CCT=5000K
  { u: 0.21403, v: 0.325595, rs: -0.91377 },
  { u: 0.216706, v: 0.327956, rs: -0.85104 },
  { u: 0.219449, v: 0.330208, rs: -0.7929 },
  { u: 0.222251, v: 0.332354, rs: -0.73895 },
  { u: 0.22511, v: 0.334393, rs: -0.6888 },
  { u: 0.22802, v: 0.336329, rs: -0.64211 },
  { u: 0.230978, v: 0.338163, rs: -0.59859 },
  { u: 0.233979, v: 0.339897, rs: -0.55795 },
  { u: 0.23702, v: 0.341536, rs: -0.51998 },

  { u: 0.240097, v: 0.34308, rs: -0.48444 },
  { u: 0.243206, v: 0.344534, rs: -0.45115 },
  { u: 0.246345, v: 0.345901, rs: -0.41994 },
  { u: 0.249511, v: 0.347183, rs: -0.39065 },
  { u: 0.252699, v: 0.348384, rs: -0.36315 },
  { u: 0.255909, v: 0.349508, rs: -0.33729 },
  { u: 0.259136, v: 0.350557, rs: -0.31298 },
  { u: 0.262379, v: 0.351534, rs: -0.2901 },
  { u: 0.265635, v: 0.352443, rs: -0.26855 },
  { u: 0.268902, v: 0.353287, rs: -0.24826 },

  { u: 0.272179, v: 0.354069, rs: -0.22914 },
  { u: 0.275462, v: 0.354791, rs: -0.21111 },
  { u: 0.27875, v: 0.355457, rs: -0.1941 },
  { u: 0.282042, v: 0.35607, rs: -0.17806 },
  { u: 0.285335, v: 0.356631, rs: -0.16293 },
  { u: 0.288629, v: 0.357144, rs: -0.14864 },
  { u: 0.291922, v: 0.357611, rs: -0.13515 },
  { u: 0.295211, v: 0.358034, rs: -0.12241 },
  { u: 0.298497, v: 0.358417, rs: -0.11038 },
  { u: 0.301778, v: 0.35876, rs: -0.09902 },

  { u: 0.305053, v: 0.359066, rs: -0.08828 }, // CCT=2000K
  { u: 0.30832, v: 0.359338, rs: -0.07814 },
  { u: 0.311579, v: 0.359577, rs: -0.06856 },
  { u: 0.314829, v: 0.359785, rs: -0.0595 },
  { u: 0.318068, v: 0.359964, rs: -0.05094 },
  { u: 0.321297, v: 0.360115, rs: -0.04285 },
  { u: 0.324514, v: 0.36024, rs: -0.0352 },
  { u: 0.327718, v: 0.360342, rs: -0.02797 },
  { u: 0.330909, v: 0.36042, rs: -0.02114 },
  { u: 0.334087, v: 0.360477, rs: -0.01467 },

  { u: 0.33725, v: 0.360513, rs: -0.00856 },
  { u: 0.340397, v: 0.360531, rs: -0.00279 },
  { u: 0.34353, v: 0.360531, rs: 0.00267 },
  { u: 0.346646, v: 0.360515, rs: 0.00784 },
  { u: 0.349746, v: 0.360483, rs: 0.01272 }
]

/**
 * Modified JIS Standard Z8725/2015 Table B.1
 *
 *  rt: reciprocal temperature, CCT = 100,000/rt
 *     can be replaced with (64 - index)
 *  angle: slope angle of the isotherm line, normalized to [0, 2*PI] radians
 *  center: coordinates of intersection with next isotherm
 *  radius: distance from 'center' to blackbody locus
 */
const UVT = [
  // [0] uv=[0.349746, 0.360483], rs=0.01272, CCT=1562.5
  {
    rt: 64,
    angle: 1.5580770127535217,
    center: [0.34166501819803285, -0.27481431147540014],
    radius: 0.6353487044409198
  },
  // [1] uv=[0.346646, 0.360515], rs=0.00784, CCT=1587.3015873015872
  {
    rt: 63,
    angle: 1.5629564874190742,
    center: [0.34192070504355887, -0.24220119342360913],
    radius: 0.6027347162952129
  },
  // [2] uv=[0.34353, 0.360531], rs=0.00267, CCT=1612.9032258064517
  {
    rt: 62,
    angle: 1.5681263331395905,
    center: [0.3419979285714286, -0.21327852380951448],
    radius: 0.5738115691212264
  },
  // [3] uv=[0.340397, 0.360531], rs=-0.00279, CCT=1639.344262295082
  {
    rt: 61,
    angle: 1.5735863195557174,
    center: [0.34191876081164646, -0.18490298266898866],
    radius: 0.5454361055211898
  },
  // [4] uv=[0.33725, 0.360513], rs=-0.00856, CCT=1666.6666666666667
  {
    rt: 60,
    angle: 1.5793561177300826,
    center: [0.3416820459422584, -0.1572493764320611],
    radius: 0.5177813452412222
  },
  // [5] uv=[0.334087, 0.360477], rs=-0.01467, CCT=1694.915254237288
  {
    rt: 59,
    angle: 1.5854652745592424,
    center: [0.3412954910442969, -0.13089934930449082],
    radius: 0.4914292207418528
  },
  // [6] uv=[0.330909, 0.36042], rs=-0.02114, CCT=1724.1379310344828
  {
    rt: 58,
    angle: 1.5919331784865254,
    center: [0.3407924348890776, -0.10710293704245863],
    radius: 0.46762739328017705
  },
  // [7] uv=[0.327718, 0.360342], rs=-0.02797, CCT=1754.3859649122808
  {
    rt: 57,
    angle: 1.5987590363781337,
    center: [0.3401268939817427, -0.08330812448132645],
    radius: 0.443823628936255
  },
  // [8] uv=[0.324514, 0.36024], rs=-0.0352, CCT=1785.7142857142858
  {
    rt: 56,
    angle: 1.6059817995239567,
    center: [0.339341050980392, -0.06098303921568093],
    radius: 0.4214839145292145
  },
  // [9] uv=[0.321297, 0.360115], rs=-0.04285, CCT=1818.1818181818182
  {
    rt: 55,
    angle: 1.6136201296997832,
    center: [0.3384406649726824, -0.039970530284301836],
    radius: 0.40045266485761655
  },
  // [10] uv=[0.318068, 0.359964], rs=-0.05094, CCT=1851.851851851852
  {
    rt: 54,
    angle: 1.6216923341445673,
    center: [0.33740645753154214, -0.019668067757010077],
    radius: 0.38012429915642376
  },
  // [11] uv=[0.314829, 0.359785], rs=-0.0595, CCT=1886.7924528301887
  {
    rt: 53,
    angle: 1.6302262606075466,
    center: [0.33626647224724077, -0.000508651214126275],
    radius: 0.3609308525487364
  },
  // [12] uv=[0.311579, 0.359577], rs=-0.06856, CCT=1923.076923076923
  {
    rt: 52,
    angle: 1.639249207250543,
    center: [0.3350359341897287, 0.017439686847594407],
    radius: 0.3429404741536474
  },
  // [13] uv=[0.30832, 0.359338], rs=-0.07814, CCT=1960.7843137254902
  {
    rt: 51,
    angle: 1.6487778696117414,
    center: [0.333680916191558, 0.03478058777120632],
    radius: 0.3255467553251396
  },
  // [14] uv=[0.305053, 0.359066], rs=-0.08828, CCT=2000
  {
    rt: 50,
    angle: 1.658848060663996,
    center: [0.3322217052694229, 0.05130993668529073],
    radius: 0.3089529625250163
  },
  // [15] uv=[0.301778, 0.35876], rs=-0.09902, CCT=2040.8163265306123
  {
    rt: 49,
    angle: 1.6694945884041794,
    center: [0.33070700975940115, 0.06660680105634045],
    radius: 0.29358198047338163
  },
  // [16] uv=[0.298497, 0.358417], rs=-0.11038, CCT=2083.3333333333335
  {
    rt: 48,
    angle: 1.680731295016023,
    center: [0.3290775177765089, 0.08136936658354044],
    radius: 0.27873026252838123
  },
  // [17] uv=[0.295211, 0.358034], rs=-0.12241, CCT=2127.659574468085
  {
    rt: 47,
    angle: 1.6926003598591044,
    center: [0.32736205808198576, 0.09538341522763258],
    radius: 0.2646110734966657
  },
  // [18] uv=[0.291922, 0.357611], rs=-0.13515, CCT=2173.913043478261
  {
    rt: 46,
    angle: 1.7051323669974012,
    center: [0.3256084619000741, 0.10835859970348213],
    radius: 0.25151846208364254
  },
  // [19] uv=[0.288629, 0.357144], rs=-0.14864, CCT=2222.222222222222
  {
    rt: 45,
    angle: 1.7183559364223504,
    center: [0.3237615367737999, 0.12078409167249922],
    radius: 0.2389566935759427
  },
  // [20] uv=[0.285335, 0.356631], rs=-0.16293, CCT=2272.7272727272725
  {
    rt: 44,
    angle: 1.7323071402231704,
    center: [0.32187193576760087, 0.13238171645736613],
    radius: 0.2272062693780046
  },
  // [21] uv=[0.282042, 0.35607], rs=-0.17806, CCT=2325.5813953488373
  {
    rt: 43,
    angle: 1.7470095148093139,
    center: [0.3199073171071075, 0.14341518079800458],
    radius: 0.2159996628919943
  },
  // [22] uv=[0.27875, 0.355457], rs=-0.1941, CCT=2380.9523809523807
  {
    rt: 42,
    angle: 1.762512426716645,
    center: [0.31787352242010575, 0.15389325749559257],
    radius: 0.20532557633899287
  },
  // [23] uv=[0.275462, 0.354791], rs=-0.21111, CCT=2439.0243902439024
  {
    rt: 41,
    angle: 1.7788513998816295,
    center: [0.3158391477636603, 0.16352981974487144],
    radius: 0.19547673297380752
  },
  // [24] uv=[0.272179, 0.354069], rs=-0.22914, CCT=2500
  {
    rt: 40,
    angle: 1.7960477697793762,
    center: [0.3137782083569461, 0.17252405648535235],
    radius: 0.18624999503801665
  },
  // [25] uv=[0.268902, 0.353287], rs=-0.24826, CCT=2564.102564102564
  {
    rt: 39,
    angle: 1.8141366735821458,
    center: [0.31164892401241917, 0.1811008886150832],
    radius: 0.17741295461826492
  },
  // [26] uv=[0.265635, 0.352443], rs=-0.26855, CCT=2631.5789473684213
  {
    rt: 38,
    angle: 1.833156191443821,
    center: [0.3094965163199545, 0.18911581206496178],
    radius: 0.16911417129458114
  },
  // [27] uv=[0.262379, 0.351534], rs=-0.2901, CCT=2702.7027027027025
  {
    rt: 37,
    angle: 1.8531459887217414,
    center: [0.3073746949976399, 0.19642991520978859],
    radius: 0.16149888447580601
  },
  // [28] uv=[0.259136, 0.350557], rs=-0.31298, CCT=2777.777777777778
  {
    rt: 36,
    angle: 1.874118430765322,
    center: [0.3052373644749397, 0.20325888358700303],
    radius: 0.15434400184415345
  },
  // [29] uv=[0.255909, 0.349508], rs=-0.33729, CCT=2857.1428571428573
  {
    rt: 35,
    angle: 1.8961036442975,
    center: [0.30310065253573104, 0.2095938236658922],
    radius: 0.14765848708525015
  },
  // [30] uv=[0.252699, 0.348384], rs=-0.36315, CCT=2941.176470588235
  {
    rt: 34,
    angle: 1.9191377012514863,
    center: [0.30099360078354487, 0.2153959763636401],
    radius: 0.1414856278762864
  },
  // [31] uv=[0.249511, 0.347183], rs=-0.39065, CCT=3030.3030303030305
  {
    rt: 33,
    angle: 1.943216463607719,
    center: [0.2989172627928304, 0.22071106145441954],
    radius: 0.13577971145436749
  },
  // [32] uv=[0.246345, 0.345901], rs=-0.41994, CCT=3125
  {
    rt: 32,
    angle: 1.9683733141643118,
    center: [0.29687937736869613, 0.22556386286446545],
    radius: 0.13051723974256518
  },
  // [33] uv=[0.243206, 0.344534], rs=-0.45115, CCT=3225.8064516129034
  {
    rt: 31,
    angle: 1.9946061822054326,
    center: [0.29488531733625706, 0.22998381195554243],
    radius: 0.12566820370070605
  },
  // [34] uv=[0.240097, 0.34308], rs=-0.48444, CCT=3333.3333333333335
  {
    rt: 30,
    angle: 2.0219186292557287,
    center: [0.2929825967274286, 0.23391148227349398],
    radius: 0.12130396367727916
  },
  // [35] uv=[0.23702, 0.341536], rs=-0.51998, CCT=3448.2758620689656
  {
    rt: 29,
    angle: 2.0502998755855657,
    center: [0.29118830435604504, 0.23736217724519235],
    radius: 0.11741546126536832
  },
  // [36] uv=[0.233979, 0.339897], rs=-0.55795, CCT=3571.4285714285716
  {
    rt: 28,
    angle: 2.0797226880968402,
    center: [0.28943015589879373, 0.2405132632874011],
    radius: 0.11380666858085033
  },
  // [37] uv=[0.230978, 0.338163], rs=-0.59859, CCT=3703.703703703704
  {
    rt: 27,
    angle: 2.1101784174016918,
    center: [0.28786096429380936, 0.24313474310661912],
    radius: 0.1107521613109432
  },
  // [38] uv=[0.22802, 0.336329], rs=-0.64211, CCT=3846.153846153846
  {
    rt: 26,
    angle: 2.1416049626873077,
    center: [0.2863794896647679, 0.24544194067252076],
    radius: 0.10801059016193218
  },
  // [39] uv=[0.22511, 0.334393], rs=-0.6888, CCT=4000
  {
    rt: 25,
    angle: 2.173965895903448,
    center: [0.2850722588562312, 0.2473397786640082],
    radius: 0.10570589308129824
  },
  // [40] uv=[0.222251, 0.332354], rs=-0.73895, CCT=4166.666666666667
  {
    rt: 24,
    angle: 2.2071878454770437,
    center: [0.2839360449384617, 0.24887738461538467],
    radius: 0.10379494248339383
  },
  // [41] uv=[0.219449, 0.330208], rs=-0.7929, CCT=4347.826086956522
  {
    rt: 23,
    angle: 2.241192981893379,
    center: [0.28299476737585144, 0.25006451737186125],
    radius: 0.10227923718503479
  },
  // [42] uv=[0.216706, 0.327956], rs=-0.85104, CCT=4545.454545454545
  {
    rt: 22,
    angle: 2.275893854846547,
    center: [0.28227950664608287, 0.25090497226207636],
    radius: 0.10117680390946412
  },
  // [43] uv=[0.21403, 0.325595], rs=-0.91377, CCT=4761.9047619047615
  {
    rt: 21,
    angle: 2.311167283960314,
    center: [0.2818088521590489, 0.25142004113830785],
    radius: 0.10047834255267118
  },
  // [44] uv=[0.211423, 0.323126], rs=-0.98159, CCT=5000
  {
    rt: 20,
    angle: 2.3469042382488388,
    center: [0.2815906095925271, 0.2516423769063168],
    radius: 0.10016686980498622
  },
  // [45] uv=[0.208891, 0.32055], rs=-1.05503, CCT=5263.1578947368425
  {
    rt: 19,
    angle: 2.382966290199034,
    center: [0.28166637015885565, 0.25157056798493355],
    radius: 0.10027171357306922
  },
  // [46] uv=[0.20644, 0.317868], rs=-1.13468, CCT=5555.555555555556
  {
    rt: 18,
    angle: 2.419202400709372,
    center: [0.28206439405290673, 0.2512197872414187],
    radius: 0.10080195057528615
  },
  // [47] uv=[0.204074, 0.315083], rs=-1.22121, CCT=5882.35294117647
  {
    rt: 17,
    angle: 2.455457050158631,
    center: [0.28280384485581195, 0.2506142805694256],
    radius: 0.10175757591471184
  },
  // [48] uv=[0.201799, 0.312199], rs=-1.31534, CCT=6250
  {
    rt: 16,
    angle: 2.4915576046438344,
    center: [0.2839210253348831, 0.24976493326829258],
    radius: 0.1031602623773441
  },
  // [49] uv=[0.199619, 0.309223], rs=-1.41784, CCT=6666.666666666667
  {
    rt: 15,
    angle: 2.527319693914486,
    center: [0.2854227268490382, 0.24870578589330386],
    radius: 0.10499815590961616
  },
  // [50] uv=[0.19754, 0.306162], rs=-1.52956, CCT=7142.857142857143
  {
    rt: 14,
    angle: 2.5625627749904445,
    center: [0.2873836458983503, 0.24742377077175734],
    radius: 0.1073408602591657
  },
  // [51] uv=[0.195566, 0.303025], rs=-1.65136, CCT=7692.307692307692
  {
    rt: 13,
    angle: 2.5970938638863714,
    center: [0.28979899901815753, 0.24596112597001407],
    radius: 0.11016416760120408
  },
  // [52] uv=[0.193701, 0.299825], rs=-1.78409, CCT=8333.333333333334
  {
    rt: 12,
    angle: 2.630716291984121,
    center: [0.2927394208749222, 0.2443129905862808],
    radius: 0.11353498138700283
  },
  // [53] uv=[0.191949, 0.296575], rs=-1.92856, CCT=9090.90909090909
  {
    rt: 11,
    angle: 2.6632378005782043,
    center: [0.29621287007983643, 0.24251193217746123],
    radius: 0.11744688121193102
  },
  // [54] uv=[0.190312, 0.293293], rs=-2.08544, CCT=10000
  {
    rt: 10,
    angle: 2.6944668408171,
    center: [0.30031629155093853, 0.2405442795616572],
    radius: 0.12199742483965115
  },
  // [55] uv=[0.188792, 0.289997], rs=-2.25517, CCT=11111.111111111111
  {
    rt: 9,
    angle: 2.7242194741544767,
    center: [0.30510621978374053, 0.23842030299545466],
    radius: 0.1272366040013603
  },
  // [56] uv=[0.187389, 0.286709], rs=-2.43778, CCT=12500
  {
    rt: 8,
    angle: 2.752316265438622,
    center: [0.3106593007014694, 0.23614237762166007],
    radius: 0.13323869683310596
  },
  // [57] uv=[0.186103, 0.283452], rs=-2.63279, CCT=14285.714285714286
  {
    rt: 7,
    angle: 2.778598392423459,
    center: [0.31713982216646924, 0.2336809122313329],
    radius: 0.1401706457899201
  },
  // [58] uv=[0.184932, 0.280251], rs=-2.8389, CCT=16666.666666666668
  {
    rt: 6,
    angle: 2.8029155790469136,
    center: [0.32476450763155795, 0.2309951235578716],
    radius: 0.14825407769977839
  },
  // [59] uv=[0.183872, 0.277131], rs=-3.05386, CCT=20000
  {
    rt: 5,
    angle: 2.8251424063925685,
    center: [0.3338091886419014, 0.22803340265044875],
    radius: 0.15777114629530897
  },
  // [60] uv=[0.182919, 0.274118], rs=-3.2742, CCT=25000
  {
    rt: 4,
    angle: 2.845172551426792,
    center: [0.34479333750561786, 0.22467864458322104],
    radius: 0.16925587436455275
  },
  // [61] uv=[0.182067, 0.271236], rs=-3.49518, CCT=33333.333333333336
  {
    rt: 3,
    angle: 2.86292875726616,
    center: [0.3587621109568161, 0.22068206258996187],
    radius: 0.18378482751222855
  },
  // [62] uv=[0.181309, 0.268506], rs=-3.71055, CCT=50000
  {
    rt: 2,
    angle: 2.8783452021567872,
    center: [0.3767872050099642, 0.2158242668310719],
    radius: 0.20245269482918657
  },
  // [63] uv=[0.180638, 0.265948], rs=-3.9133, CCT=100000
  {
    rt: 1,
    angle: 2.89140783088458,
    center: [0.4017745439214908, 0.20943903214128912],
    radius: 0.22824249057964263
  },
  // [64] uv=[0.180046, 0.263577], rs=-4.09562, CCT=Infinity
  { rt: 0, angle: 2.902114876154681, center: null, radius: null }
]

function xy2xyz(xy) {
  const x = xy[0],
    y = xy[1]
  return [x / y, 1, (1 - x - y) / y]
}

function xyz2xy(xyz) {
  const sum = math.sum(xyz)
  return [xyz[0] / sum, xyz[1] / sum]
}

/**
 * xy to CIE1960 UCS uv
 */
function xy2uv(xy) {
  const x = xy[0],
    y = xy[1],
    denominator = -2 * x + 12 * y + 3,
    u = (4 * x) / denominator,
    v = (6 * y) / denominator
  return [u, v]
}

function uv2xy(uv) {
  const u = uv[0],
    v = uv[1],
    divider = 2 * u - 8 * v + 4
  if (divider === 0) {
    throw new Error('Invalid uv coordinates, cannot convert to xy.')
  }
  const x = (3 * u) / divider,
    y = (2 * v) / divider
  return [x, y]
}

function xy2(xy) {
  const x = xy[0],
    y = xy[1]
  if (x < 0 || y < 0 || x + y > 1) {
    throw new Error('Invalid xy coordinates, must be in the range [0,1] and sum to <= 1.')
  }
  return {
    xy: [x, y],
    xyz: xy2xyz(xy),
    uv: xy2uv(xy)
  }
}

function xyz2(xyz) {
  const x = xyz[0],
    y = xyz[1],
    z = xyz[2],
    xy = xyz2xy(xyz),
    uv = xy2uv(xy)
  return {
    xy,
    xyz: [x, y, z],
    uv
  }
}

function uv2(uv) {
  const u = uv[0],
    v = uv[1],
    xy = uv2xy(uv),
    xyz = xy2xyz(xy)
  return {
    xy,
    xyz,
    uv: [u, v]
  }
}

/**
 * color temperature to cordinate on blackbody locus
 * formula of Kang et al.
 */
function cct2xy_kang(cct) {
  // kang et al. formula 1667K - 2222k - 4000K - 25000K
  const a = t < 4000 ? -0.2661239 : -3.0258469,
    b = t < 4000 ? -0.2343589 : 2.1070379,
    c = t < 4000 ? 0.8776956 : 0.2226347,
    d = t < 4000 ? 0.17991 : 0.24039,
    e = t < 2222 ? -1.1063814 : t < 4000 ? -0.9549476 : 3.081758,
    f = t < 2222 ? -1.3481102 : t < 4000 ? -1.37418593 : -5.8733867,
    g = t < 2222 ? 2.18555832 : t < 4000 ? 2.09137015 : 3.75112997,
    h = t < 2222 ? -0.20219683 : t < 4000 ? -0.16748867 : -0.37001483,
    xy = [
      (a * 10 ** 9) / t ** 3 + (b * 10 ** 6) / t ** 2 + (c * 10 ** 3) / t + d,
      e * x ** 3 + f * x ** 2 + g * x + h
    ]

  return {
    cct,
    duv: 0,
    ...xy2(xy)
  }
}

/**
 * Convert CIE 1960 UCS uv coordinates to distance from the blackbody locus
 * ANSI C78.377-2011
 */
function uv2duv_ansi(uv) {
  const ux = uv[0] - 0.292,
    vx = uv[1] - 0.312,
    l0 = Math.sqrt(ux * ux + vx * vx),
    a = Math.acos(ux / l0),
    k = [-0.471106, 1.925865, -2.4243787, 1.5317403, -0.5179722, 0.0893944, -0.00616793],
    l1 =
      k[0] +
      k[1] * a +
      k[2] * a * a +
      k[3] * a * a * a +
      k[4] * a * a * a * a +
      k[5] * a * a * a * a * a +
      k[6] * a * a * a * a * a * a
  return l0 - l1
}

/**
 * CIE 1960 UCS uv to CCT and Duv
 * JIS Standard Z8725/2015
 */
function uv2cct_jis(uv, uvt = JIS_Z8725_UVT) {
  const u = uv[0],
    v = uv[1],
    _dt = Array(uvt.length),
    fndt = (n) =>
      _dt[n] !== undefined
        ? _dt[n]
        : (_dt[n] = distanceFromPointToLine(
            [u, v],
            // isotherm Ax + By + C = 0
            // set A to negative value to keep normal vector toword high temperature direction.
            {
              A: -1,
              B: uvt[n].rs,
              C: uvt[n].u - uvt[n].rs * uvt[n].v
            }
          ))

  let dt = fndt(0),
    i = 0
  if (dt.sign > 0) {
    throw new Error('input value is too high temperature. uv:' + uv)
  }
  // TODO binary or fibonacchi search
  for (; i < uvt.length; i++) {
    dt = fndt(i)
    // (u, v) exists in high temprature side of isotherm line
    if (dt.sign > 0) {
      break
    }
  }

  if (i === uvt.length) {
    throw new Error('input value is too low temperature. uv:' + uv)
  }

  const d0 = fndt(i - 1),
    d1 = fndt(i),
    // divide ratio
    dr = d1.distance / (d0.distance + d1.distance),
    rt = i - dr,
    cct = 100000 / rt

  // interpolate u, v from closest 3 points on the blackbody locus
  let n = i - 1
  if (i === uvt.length - 1 || (dr > 0.5 && i > 1)) {
    n--
  }
  const { u: u0, v: v0 } = uvt[n],
    { u: u1, v: v1 } = uvt[n + 1],
    { u: u2, v: v2 } = uvt[n + 2],
    uqi = quadraticInterpolation([n, u0], [n + 1, u1], [n + 2, u2]),
    vqi = quadraticInterpolation([n, v0], [n + 1, v1], [n + 2, v2]),
    ux = uqi.f(rt),
    vx = vqi.f(rt)
  let duv = Math.sqrt((u - ux) ** 2 + (v - vx) ** 2)
  if (v < vx) {
    duv = -duv
  }
  return { cct, duv, ...uv2([ux, vx]) }
}

/**
 * Convert CIE 1960 UCS uv coordinates to CCT and Duv
 * @param {number[u, v]} uv - CIE 1960 UCS uv coordinates
 * @returns {object} - Object containing cct, duv
 */
function uv2cct_jis_mod(uv, uvt = UVT) {
  let from = 0,
    to = uvt.length - 2

  // binary search for the uv point within a sector
  while (from <= to) {
    const mid = from + ((to - from) >>> 1),
      // rt0 = uvt.length - mid
      // rt1 = uvt.length - mid - 1
      { rt: rt0, angle: angle0, center, radius } = uvt[mid],
      { rt: rt1, angle: angle1 } = uvt[mid + 1],
      angle = angleFromSlope((uv[1] - center[1]) / (uv[0] - center[0]))

    if (angle > angle1) {
      from = mid + 1
      continue
    }

    if (angle < angle0) {
      to = mid - 1
      continue
    }

    const splitRatio = (angle - angle0) / (angle1 - angle0),
      // If limit the table's rt step to -1 and the value range from table.length - 1 to 0
      // const rt = uvt.length - mid - splitRatio
      rt = rt0 + (rt1 - rt0) * splitRatio,
      cct = rt === 0 ? Infinity : 100000 / rt,
      duv = distanceFromPointToPoint(uv, center) - radius

    return { cct, duv }
  }
  throw new Error('input value is out of range. uv:' + uv)
}

/**
 * Convert CCT and Duv to CIE 1960 UCS uv coordinates
 * @param {number} cct - corelated temperature
 * @param {number} duv - distance from blacbody locus, positive is on the greenish side, negative is on the magenta side
 * @param {number[u, v]} uv - CIE 1960 UCS uv coordinates
 * @returns {object} - Object containing uv, xy, xyz
 */
function cct2uv_jis_mod(cct, duv, uvt = UVT) {
  const rt = 100000 / cct
  let from = 0,
    to = uvt.length - 2

  // binary search for the uv point within a sector
  while (from <= to) {
    const mid = from + ((to - from) >>> 1),
      { rt: rt0, angle: angle0, center, radius } = uvt[mid],
      { rt: rt1, angle: angle1 } = uvt[mid + 1]

    if (rt < rt1) {
      from = mid + 1
      continue
    }
    if (rt > rt0) {
      to = mid - 1
      continue
    }

    const angle = angle0 + (angle1 - angle0) * ((rt - rt0) / (rt1 - rt0))
    let ud = (radius + duv) * Math.cos(angle),
      vd = (radius + duv) * Math.sin(angle)
    const uv = [center[0] + ud, center[1] + vd]
    return uv2(uv)
  }
  throw new Error('input value is out of range. ' + { cct, uv })
}

function modify_jis_table() {
  // modify JIS Z8725 table to add 1667K, 2222K, 4000K, 25000K
  const uvt = JIS_Z8725_UVT.reverse()
  for (let i = 0; i < uvt.length; i++) {
    const { u: u0, v: v0, rs: rs0 } = uvt[i],
      rt = uvt.length - i - 1,
      cct = rt === 0 ? Infinity : 100000 / rt,
      m0 = 1 / rs0,
      angle = angleFromSlope(m0)
    console.log(`// [${i}] uv=[${u0}, ${v0}], rs=${rs0}, CCT=${cct}`)
    if (i == uvt.length - 1) {
      console.log(`{rt: ${rt}, angle: ${angle}, center: null, radius: null},`)
    } else {
      const { u: u1, v: v1, rs: rs1 } = uvt[i + 1],
        m1 = 1 / rs1,
        line0 = lineFromSlopeAndPoint(m0, [u0, v0]),
        line1 = lineFromSlopeAndPoint(m1, [u1, v1]),
        li = lineIntersection(line0, line1),
        r = distanceFromPointToPoint([u0, v0], li.intersection)
      console.log(
        `{rt: ${rt}, angle: ${angle}, center: [${li.intersection[0]}, ${li.intersection[1]}], radius:${r}},`
      )
    }
  }
}

function test() {
  // test uv2cct_jis_mod and cct2uv_jis_mod
  const uv = [0.19765287214329832, 0.3122297714638666],
    test1 = uv2cct_jis_mod(uv),
    uv01 = cct2uv_jis_mod(test1.cct, test1.duv),
    uv02 = cct2uv_jis_mod(test1.cct, -test1.duv),
    test2 = uv2cct_jis_mod(uv02.uv)
  console.log(uv2(uv))
  console.log(test1)
  console.log(uv01)
  console.log(uv02)
  console.log(test2)
}

// generate table
// modify_jis_table()

// reversible conversion test
// test()

module.exports = {
  uv2cct_jis: uv2cct_jis,
  uv2cct: uv2cct_jis_mod,
  cct2uv: cct2uv_jis_mod,
  uv2,
  xy2,
  xyz2
}
