const fontList = {
	' ': ' ',
	a: '\uD835\uDDEE',
	b: '\uD835\uDDEF',
	c: '\uD835\uDDF0',
	d: '\uD835\uDDF1',
	e: '\uD835\uDDF2',
	f: '\uD835\uDDF3',
	g: '\uD835\uDDF4',
	h: '\uD835\uDDF5',
	i: '\uD835\uDDF6',
	j: '\uD835\uDDF7',
	k: '\uD835\uDDF8',
	l: '\uD835\uDDF9',
	m: '\uD835\uDDFA',
	n: '\uD835\uDDFB',
	o: '\uD835\uDDFC',
	p: '\uD835\uDDFD',
	q: '\uD835\uDDFE',
	r: '\uD835\uDDFF',
	s: '\uD835\uDE00',
	t: '\uD835\uDE01',
	u: '\uD835\uDE02',
	v: '\uD835\uDE03',
	w: '\uD835\uDE04',
	x: '\uD835\uDE05',
	y: '\uD835\uDE06',
	z: '\uD835\uDE07',
	A: '\uD835\uDDD4',
	B: '\uD835\uDDD5',
	C: '\uD835\uDDD6',
	D: '\uD835\uDDD7',
	E: '\uD835\uDDD8',
	F: '\uD835\uDDD9',
	G: '\uD835\uDDDA',
	H: '\uD835\uDDDB',
	I: '\uD835\uDDDC',
	J: '\uD835\uDDDD',
	K: '\uD835\uDDDE',
	L: '\uD835\uDDDF',
	M: '\uD835\uDDE0',
	N: '\uD835\uDDE1',
	O: '\uD835\uDDE2',
	P: '\uD835\uDDE3',
	Q: '\uD835\uDDE4',
	R: '\uD835\uDDE5',
	S: '\uD835\uDDE6',
	T: '\uD835\uDDE7',
	U: '\uD835\uDDE8',
	V: '\uD835\uDDE9',
	W: '\uD835\uDDEA',
	X: '\uD835\uDDEB',
	Y: '\uD835\uDDEC',
	Z: '\uD835\uDDED',
	À: '\uD835\uDDD4',
	Á: '\uD835\uDDD4',
	Ä: '\uD835\uDDD4',
	Æ: '\uD835\uDDD4',
	Å: '\uD835\uDDD4',
	á: '\uD835\uDDEE',
};

function fontChanger(text) {
	const changeFonts = /\*\*(.*?)\*\*/g;
	const _changeFonts = /\*(.*?)\*/g;

	function fontOutput(str) {
		return str
			.split('')
			.map(char => fontList[char] || char)
			.join('');
	}

	return text.replace(changeFonts && _changeFonts, (match, p1) => `${fontOutput(p1)}`);
}