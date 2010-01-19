/*
Original:
	Copyright (c) 1999 - 2002 Paul Johnston (paj [at] pajhome [dot] org [dot] uk)
	http://pajhome.org.uk/crypt/md5
	Distributed under the BSD License

Rewritten:
	22-01-2003
	Kai Meder (kai [at] meder [dot] info)
	http://stuff.meder.info/md5.js


THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS
BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*
EXAMPLE:

// create an instance of the md5-algorithm
var m = new md5();

// create standard md5-hash of a string
var hash = m.hash('tiny-shiny-string');

// create HMAC
var hmac = m.hmac('tiny-shiny-string' , 'my key');
*/

function md5()
{
/* bits per input character.
   8 - ASCII
   16 - Unicode */
var char_size = 8;


/**
 * @access private
 */
this.add = function(x , y)
	{
	var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);

	return (msw << 16) | (lsw & 0xFFFF);
	}


/**
 * @access private
 */
this.rotate_left = function(num , cnt)
	{
	return (num << cnt) | (num >>> (32 - cnt));
	}


/**
 * @access private
 */
this.cmn = function(q , a , b , x , s , t)
	{
	return this.add(this.rotate_left(this.add(this.add(a , q) , this.add(x , t)) , s),b);
	}


/**
 * @access private
 */
this.ff = function(a , b , c , d , x , s , t)
	{
	return this.cmn((b & c) | ((~b) & d) , a , b , x , s , t);
	}


/**
 * @access private
 */
this.gg = function(a , b , c , d , x , s , t)
	{
	return this.cmn((b & d) | (c & (~d)) , a , b , x , s , t);
	}


/**
 * @access private
 */
this.hh = function(a , b , c , d , x , s , t)
	{
	return this.cmn(b ^ c ^ d , a , b , x , s , t);
	}


/**
 * @access private
 */
this.ii = function(a , b , c , d , x , s , t)
	{
	return this.cmn(c ^ (b | (~d)) , a , b , x , s , t);
	}


/**
 * @access private
 */
this.core = function(x , len)
	{
	/* append padding */
	x[len >> 5] |= 0x80 << ((len) % 32);
	x[(((len + 64) >>> 9) << 4) + 14] = len;

	var a =  1732584193;
	var b = -271733879;
	var c = -1732584194;
	var d =  271733878;

	var old_a , old_b , old_c , old_d;

	for(var i=0; i<x.length; i+=16)
		{
		old_a = a;
		old_b = b;
		old_c = c;
		old_d = d;

		a = this.ff(a , b , c , d , x[i+ 0] , 7  , -680876936);
		d = this.ff(d , a , b , c , x[i+ 1] , 12 , -389564586);
		c = this.ff(c , d , a , b , x[i+ 2] , 17 ,  606105819);
		b = this.ff(b , c , d , a , x[i+ 3] , 22 , -1044525330);
		a = this.ff(a , b , c , d , x[i+ 4] , 7  , -176418897);
		d = this.ff(d , a , b , c , x[i+ 5] , 12 ,  1200080426);
		c = this.ff(c , d , a , b , x[i+ 6] , 17 , -1473231341);
		b = this.ff(b , c , d , a , x[i+ 7] , 22 , -45705983);
		a = this.ff(a , b , c , d , x[i+ 8] , 7  ,  1770035416);
		d = this.ff(d , a , b , c , x[i+ 9] , 12 , -1958414417);
		c = this.ff(c , d , a , b , x[i+10] , 17 , -42063);
		b = this.ff(b , c , d , a , x[i+11] , 22 , -1990404162);
		a = this.ff(a , b , c , d , x[i+12] , 7  ,  1804603682);
		d = this.ff(d , a , b , c , x[i+13] , 12 , -40341101);
		c = this.ff(c , d , a , b , x[i+14] , 17 , -1502002290);
		b = this.ff(b , c , d , a , x[i+15] , 22 ,  1236535329);

		a = this.gg(a , b , c , d , x[i+ 1] , 5  , -165796510);
		d = this.gg(d , a , b , c , x[i+ 6] , 9  , -1069501632);
		c = this.gg(c , d , a , b , x[i+11] , 14 ,  643717713);
		b = this.gg(b , c , d , a , x[i+ 0] , 20 , -373897302);
		a = this.gg(a , b , c , d , x[i+ 5] , 5  , -701558691);
		d = this.gg(d , a , b , c , x[i+10] , 9  ,  38016083);
		c = this.gg(c , d , a , b , x[i+15] , 14 , -660478335);
		b = this.gg(b , c , d , a , x[i+ 4] , 20 , -405537848);
		a = this.gg(a , b , c , d , x[i+ 9] , 5  ,  568446438);
		d = this.gg(d , a , b , c , x[i+14] , 9  , -1019803690);
		c = this.gg(c , d , a , b , x[i+ 3] , 14 , -187363961);
		b = this.gg(b , c , d , a , x[i+ 8] , 20 ,  1163531501);
		a = this.gg(a , b , c , d , x[i+13] , 5  , -1444681467);
		d = this.gg(d , a , b , c , x[i+ 2] , 9  , -51403784);
		c = this.gg(c , d , a , b , x[i+ 7] , 14 ,  1735328473);
		b = this.gg(b , c , d , a , x[i+12] , 20 , -1926607734);

		a = this.hh(a , b , c , d , x[i+ 5] , 4  , -378558);
		d = this.hh(d , a , b , c , x[i+ 8] , 11 , -2022574463);
		c = this.hh(c , d , a , b , x[i+11] , 16 ,  1839030562);
		b = this.hh(b , c , d , a , x[i+14] , 23 , -35309556);
		a = this.hh(a , b , c , d , x[i+ 1] , 4  , -1530992060);
		d = this.hh(d , a , b , c , x[i+ 4] , 11 ,  1272893353);
		c = this.hh(c , d , a , b , x[i+ 7] , 16 , -155497632);
		b = this.hh(b , c , d , a , x[i+10] , 23 , -1094730640);
		a = this.hh(a , b , c , d , x[i+13] , 4  ,  681279174);
		d = this.hh(d , a , b , c , x[i+ 0] , 11 , -358537222);
		c = this.hh(c , d , a , b , x[i+ 3] , 16 , -722521979);
		b = this.hh(b , c , d , a , x[i+ 6] , 23 ,  76029189);
		a = this.hh(a , b , c , d , x[i+ 9] , 4  , -640364487);
		d = this.hh(d , a , b , c , x[i+12] , 11 , -421815835);
		c = this.hh(c , d , a , b , x[i+15] , 16 ,  530742520);
		b = this.hh(b , c , d , a , x[i+ 2] , 23 , -995338651);

		a = this.ii(a , b , c , d , x[i+ 0] , 6  , -198630844);
		d = this.ii(d , a , b , c , x[i+ 7] , 10 ,  1126891415);
		c = this.ii(c , d , a , b , x[i+14] , 15 , -1416354905);
		b = this.ii(b , c , d , a , x[i+ 5] , 21 , -57434055);
		a = this.ii(a , b , c , d , x[i+12] , 6  ,  1700485571);
		d = this.ii(d , a , b , c , x[i+ 3] , 10 , -1894986606);
		c = this.ii(c , d , a , b , x[i+10] , 15 , -1051523);
		b = this.ii(b , c , d , a , x[i+ 1] , 21 , -2054922799);
		a = this.ii(a , b , c , d , x[i+ 8] , 6  ,  1873313359);
		d = this.ii(d , a , b , c , x[i+15] , 10 , -30611744);
		c = this.ii(c , d , a , b , x[i+ 6] , 15 , -1560198380);
		b = this.ii(b , c , d , a , x[i+13] , 21 ,  1309151649);
		a = this.ii(a , b , c , d , x[i+ 4] , 6  , -145523070);
		d = this.ii(d , a , b , c , x[i+11] , 10 , -1120210379);
		c = this.ii(c , d , a , b , x[i+ 2] , 15 ,  718787259);
		b = this.ii(b , c , d , a , x[i+ 9] , 21 , -343485551);

		a = this.add(a , old_a);
		b = this.add(b , old_b);
		c = this.add(c , old_c);
		d = this.add(d , old_d);
		}

	return new Array(a, b, c, d);
	}


/**
 * @access private
 */
this.str2bin = function(str)
	{
	var bin = new Array();
	var mask = (1 << this.char_size) - 1;

	for(var i=0; i<str.length * this.char_size; i+=this.char_size)
		bin[i>>5] |= (str.charCodeAt(i / this.char_size) & mask) << (i%32);

	return bin;
	}


/**
 * @access private
 */
this.bin2hex = function(bin)
	{
 	var tab = "0123456789abcdef";
	var str = "";

	for(var i=0; i<bin.length * 4; i++)
		{
		str += tab.charAt((bin[i>>2] >> ((i%4)*8+4)) & 0xF) + tab.charAt((bin[i>>2] >> ((i%4)*8  )) & 0xF);
		}

	return str;
	}


/**
 * computes the actual md5-hash
 *
 * @access public
 *
 * @param string data to encrypt
 *
 * @return hex-string md5-hash
 */
this.hash = function(data)
	{
	return this.bin2hex(this.core(this.str2bin(data) , data.length * this.char_size));
	}


/**
 * computes HMAC of data and a key
 * for detailed info to HMAC see following specs:
 * 	http://www.ietf.org/rfc/rfc2104.txt
 *
 * if you know any method to simulate this in PHP serverside,
 * please let me know ! (kai)
 *
 * @access public
 *
 * @param string data to encrypt
 * @param string key
 *
 * @return hex-string HMAC-hash
 */
this.hmac = function(data , key)
	{
	var bin_data = this.str2bin(data);
	var bin_key = this.str2bin(key);

	if(bin_key.length > 16)
		bin_key = this.core(bin_key , key.length * this.char_size);

	var i_pad = new Array(16);
	var o_pad = new Array(16);

	for(var i=0; i<16; i++)
		{
		i_pad[i] = bin_key[i] ^ 0x36363636;
		o_pad[i] = bin_key[i] ^ 0x5C5C5C5C;
		}

	var hash = this.core(i_pad.concat(bin_data) , 512 + (data.length * this.char_size));
	return this.bin2hex(this.core(o_pad.concat(hash) , 512 + 128));
	}
}

