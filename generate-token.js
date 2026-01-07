const businessName = process.argv[2] || 'HenriDemo';
let hash = 0;
for (let i = 0; i < businessName.length; i++) {
  hash = ((hash << 5) - hash) + businessName.charCodeAt(i);
  hash = hash & hash;
}
console.log(Math.abs(hash).toString(36));
