var map = new Map();

map.set('foo', 'bar');
map.set(1, 2);
map.set('key', 'value');

Array.from(map.entries()).forEach(entry => console.log(`Key: ${entry[0]}\nValue: ${entry[1]}`));