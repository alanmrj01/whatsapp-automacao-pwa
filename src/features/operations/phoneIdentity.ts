export function normalizeExclusionPhone(value:string){
  const digits=value.replace(/\D/g,'')
  if(!digits)return ''
  const areaCode=Number(digits.slice(0,2))
  const plausibleBrazilArea=Number.isInteger(areaCode)&&areaCode>=11&&areaCode<=99
  const brazilMobile=digits.length===11&&plausibleBrazilArea&&digits[2]==='9'
  const brazilLandline=digits.length===10&&plausibleBrazilArea&&/[2-5]/.test(digits[2]??'')
  return brazilMobile||brazilLandline?'55'+digits:digits
}
