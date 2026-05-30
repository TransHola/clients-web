const routeLegs = [{duration: 3600}, {duration: 3600}];
let outboundDuration = 7200;
if (routeLegs.length > 1) {
  outboundDuration = routeLegs.slice(0, -1).reduce((s, l) => s + l.duration, 0);
}
console.log(outboundDuration);
