// Geometria compartilhada pelas variantes cromáticas do corsário do mercado negro.
// As versões recoloridas preservam exatamente o mesmo atlas e podem reutilizar este mapa.
export const BLACK_MARKET_CORSAIR_MAPPING = Object.freeze({
  frameWidth: 400,
  frameHeight: 400,
  columns: 4,
  rows: 4,
  frameCount: 16,
  angleStepDegrees: 22.5,
  headingZero: 'north',
  clockwise: true,
  cannonSlots: 10,
  // Folha física: W, WNW, NW, NNW / N, NNE, NE, ENE /
  // E, ESE, SE, SSE / S, SSW, SW, WSW.
  framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
  cannonMuzzles: Object.freeze({
    0: { port: Object.freeze([[112,319],[133,320],[154,321],[175,322],[196,323],[217,323],[238,322],[259,321],[280,319],[301,316]].map(Object.freeze)) },
    1: { port: Object.freeze([[103,274],[124,281],[145,288],[166,295],[187,302],[208,309],[229,315],[250,321],[271,326],[292,330]].map(Object.freeze)) },
    2: { port: Object.freeze([[112,242],[132,252],[152,262],[172,272],[192,282],[212,292],[232,302],[252,312],[271,321],[289,329]].map(Object.freeze)) },
    3: { port: Object.freeze([[127,221],[137,234],[147,247],[157,260],[167,273],[177,286],[187,299],[197,311],[208,322],[219,331]].map(Object.freeze)) },

    5: { starboard: Object.freeze([[282,230],[271,241],[260,252],[249,263],[238,274],[227,285],[216,296],[205,307],[194,317],[183,326]].map(Object.freeze)) },
    6: { starboard: Object.freeze([[283,269],[265,275],[247,281],[229,287],[211,293],[193,299],[175,305],[157,311],[138,318],[119,325]].map(Object.freeze)) },
    7: { starboard: Object.freeze([[298,282],[277,287],[256,292],[235,297],[214,302],[193,307],[172,312],[151,317],[130,322],[109,327]].map(Object.freeze)) },
    8: { starboard: Object.freeze([[301,317],[280,319],[259,321],[238,322],[217,323],[196,323],[175,322],[154,321],[133,320],[112,319]].map(Object.freeze)) },
    9: { starboard: Object.freeze([[292,330],[271,326],[250,321],[229,315],[208,309],[187,302],[166,295],[145,288],[124,281],[103,274]].map(Object.freeze)) },
    10:{ starboard: Object.freeze([[289,329],[271,321],[252,312],[232,302],[212,292],[192,282],[172,272],[152,262],[132,252],[112,242]].map(Object.freeze)) },
    11:{ starboard: Object.freeze([[219,331],[208,322],[197,311],[187,299],[177,286],[167,273],[157,260],[147,247],[137,234],[127,221]].map(Object.freeze)) },

    13:{ port: Object.freeze([[282,230],[271,241],[260,252],[249,263],[238,274],[227,285],[216,296],[205,307],[194,317],[183,326]].map(Object.freeze)) },
    14:{ port: Object.freeze([[283,269],[265,275],[247,281],[229,287],[211,293],[193,299],[175,305],[157,311],[138,318],[119,325]].map(Object.freeze)) },
    15:{ port: Object.freeze([[298,282],[277,287],[256,292],[235,297],[214,302],[193,307],[172,312],[151,317],[130,322],[109,327]].map(Object.freeze)) },
  }),
});
