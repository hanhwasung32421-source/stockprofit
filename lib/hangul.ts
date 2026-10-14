// 영문 자판(두벌식)으로 친 글자를 한글로 조합한다. 예) "tkatjdwjswk" → "삼성전자"
// 브라우저는 OS의 한/영 상태를 바꿀 수 없어서, 영문 상태로 입력돼도 한글이 나오게 앱에서 변환한다.

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const KEYS: Record<string, string> = {
  q: "ㅂ", w: "ㅈ", e: "ㄷ", r: "ㄱ", t: "ㅅ", y: "ㅛ", u: "ㅕ", i: "ㅑ", o: "ㅐ", p: "ㅔ",
  a: "ㅁ", s: "ㄴ", d: "ㅇ", f: "ㄹ", g: "ㅎ", h: "ㅗ", j: "ㅓ", k: "ㅏ", l: "ㅣ",
  z: "ㅋ", x: "ㅌ", c: "ㅊ", v: "ㅍ", b: "ㅠ", n: "ㅜ", m: "ㅡ",
  Q: "ㅃ", W: "ㅉ", E: "ㄸ", R: "ㄲ", T: "ㅆ", O: "ㅒ", P: "ㅖ",
};
// Shift를 눌러도 모양이 같은 키는 소문자와 동일하게 취급
for (const k of "YUIASDFGHJKLZXCVBNM") KEYS[k] = KEYS[k.toLowerCase()];

const V_COMBINE: Record<string, string> = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
const F_COMBINE: Record<string, string> = {
  "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ",
  "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ",
};
const F_SPLIT: Record<string, [string, string]> = Object.fromEntries(Object.entries(F_COMBINE).map(([k, v]) => [v, [k[0], k[1]]]));

const isVowel = (j: string) => JUNG.includes(j);

/** 알파벳은 두벌식 한글로 조합하고, 그 외 문자(숫자·공백·이미 한글인 글자 등)는 그대로 둔다 */
export function engToKor(input: string): string {
  let out = "";
  let c = -1; // 초성
  let v = -1; // 중성
  let f = 0; // 종성

  const flush = () => {
    if (c >= 0 && v >= 0) out += String.fromCharCode(0xac00 + (c * 21 + v) * 28 + f);
    else if (c >= 0) out += CHO[c];
    else if (v >= 0) out += JUNG[v];
    c = -1;
    v = -1;
    f = 0;
  };

  for (const ch of input) {
    const j = KEYS[ch];
    if (!j) {
      flush();
      out += ch;
      continue;
    }
    if (isVowel(j)) {
      const vi = JUNG.indexOf(j);
      if (c >= 0 && v < 0) v = vi;
      else if (v >= 0 && f === 0) {
        const comb = V_COMBINE[JUNG[v] + j]; // ㅗ+ㅏ → ㅘ
        if (comb) v = JUNG.indexOf(comb);
        else {
          flush();
          v = vi;
        }
      } else if (c >= 0 && v >= 0 && f > 0) {
        // 받침이 다음 글자의 초성으로 넘어간다 (닭 + ㅏ → 달 + 가)
        const fj = JONG[f];
        const split = F_SPLIT[fj];
        let moved: string;
        if (split) {
          f = JONG.indexOf(split[0]);
          moved = split[1];
        } else {
          f = 0;
          moved = fj;
        }
        flush();
        c = CHO.indexOf(moved);
        v = vi;
      } else {
        flush();
        v = vi;
      }
    } else {
      const ci = CHO.indexOf(j);
      if (c < 0 && v < 0) c = ci;
      else if (c >= 0 && v < 0) {
        flush();
        c = ci;
      } else if (v >= 0 && f === 0) {
        const ji = JONG.indexOf(j);
        if (c >= 0 && ji > 0) f = ji;
        else {
          flush();
          c = ci;
        }
      } else if (f > 0) {
        const comb = F_COMBINE[JONG[f] + j];
        if (comb) f = JONG.indexOf(comb);
        else {
          flush();
          c = ci;
        }
      } else {
        flush();
        c = ci;
      }
    }
  }
  flush();
  return out;
}
