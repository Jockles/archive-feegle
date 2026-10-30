# Amatakka Grammar Specification and Dictionary Rule Audit

*PolyGlot grammar extraction; PGD vocabulary intentionally ignored*

*Revised 29 September 2026: new SRD verbs regularised to* \-uu\*; gender glosses aligned; see section 12.\*

## 1\. Scope and authority

This report converts the grammar, morphology, phonology and rule configuration encoded in the supplied PolyGlot file into a human-readable specification, then compares those rules with the larger Amatakka Dictionary in Google Sheets. The vocabulary stored inside the PGD lexicon is not used as evidence.

Where the larger dictionary contains a CANON (fialleril) form or a well-established word family, that evidence outranks a contradictory PGD configuration. The PGD is strong evidence for intended SRD productive grammar where it supplies paradigms not otherwise represented in the dictionary. Apparent configuration mistakes are flagged rather than silently promoted into the language.

## 2\. PolyGlot structure recovered

- Language: Amatakka  
- Regex processing: enabled  
- Word uniqueness: enforced  
- Illegal pronunciation cluster explicitly recorded: dt  
- Romanization guide: disabled  
- Declension/conjugation generation rules: 383  
- Transform operations: 1,278

The file also contains parts-of-speech definitions, word-level grammar classes, declension dimensions, source-language classes and reversion/history information.

## 3\. Grammatical categories

### 3.1 Parts of speech

Noun, Places, Verb, adjective, adverb, conjunction, interjection, modifiers, numeral, particle, prefix, preposition, pronoun and suffix.

These are PolyGlot organisational categories rather than necessarily a complete syntactic theory. "Places", for example, is best understood as a lexical filing category.

### 3.2 Word-level classification

The PGD contains grammar-class systems including Lang-Base, local-Source, Gender-Mod and verb type. These allow rules to apply selectively to native Amatakka material, borrowed material, gender-marked forms and different verb classes.

## 4\. Gender morphology

The PGD defines Masculine, Feminine, Gerian, Null and an unmarked "none" value.

| Category | PGD output | Dictionary evidence | Status |
| :---- | :---- | :---- | :---- |
| Masculine | \-ka | \-ka explicitly male, including Fialleril material | CONFIRMED |
| Feminine | \-ke | \-ku explicitly female, including Fialleril material | CONFLICT |
| Gerian | \-ku | \-ke used for the fourth/other-gender category in the BLW-derived system | CONFLICT |
| Null | \-ki | \-ki a nonbinary/null marker with several related forms | CONFIRMED |
| Unmarked | no suffix | ungendered headwords are common | CONFIRMED |

Normalized SRD rule: \-ka masculine; \-ku feminine; \-ke Gerian/fourth-gender; \-ki null/nonbinary; unmarked where appropriate.

The Feminine and Gerian labels in the PGD are therefore treated as reversed configuration labels rather than as evidence that the established suffix meanings changed. Dictionary glosses that described \-ke forms as "third- or fourth-gender" (*amavikka-ke*, *nimke*) were aligned to "fourth-gender (Gerian)" on 29 September 2026\.

## 5\. Verb system

PolyGlot encodes verbs across two dimensions: six subject persons/numbers and seven tense/aspect/mood categories. Subject agreement is built into the verb stem and TAM morphology follows.

### 5.1 Subject dimension

1st Person Singular; 2nd Person Singular; 3rd Person Singular; 1st Person Plural; 2nd Person Plural; 3rd Person Plural.

### 5.2 Tense/aspect/mood dimension

Simple Present; Present Continuous; Simple Future; Speculative Future; Simple Past; Perfect Past; Speculative Past.

### 5.3 Regular native verb class

The Regular class applies to Amatakka-base verbs marked regular whose citation form matches .\*uu. The citation ending \-uu therefore functions as a productive regular verbal lemma marker. Conjugation replaces \-uu with a subject-conditioned ending.

Simple-present person endings:

- 1sg: \-a  
- 2sg: \-uh  
- 3sg: stem-conditioned \-i / \-at / \-is / \-di / \-dat / \-dis  
- 1pl: \-ta  
- 2pl: \-tu  
- 3pl: stem-conditioned \-ek / \-et / \-es / \-dik / \-det / \-des

Third-person forms are conditioned by stem-final phonology and should be generated from the encoded transformation rules rather than reduced to a single invariant suffix.

### 5.4 Tense/aspect/mood markers

- Simple Present — zero; person marking only.  
- Present Continuous — \-tol. The encoded 2sg rule contracts final h \+ \-tol to \-ttol.  
- Simple Future — \-ker. Some 3rd-person t-final forms contain an \-oker alternation.  
- Speculative Future — \-bor. SRD meaning (30 September 2026): the distant hopeful future, "the future after we are free". It is a hopeful, very distant tense, not a guess.  
- Simple Past — \-nao. Some 3rd-person s-final forms change to \-dao.  
- Perfect Past — \-nun. Some 3rd-person s-final forms change to \-dun.  
- Speculative Past — \-qel, with several 3rd-person stem-conditioned alternations. SRD meaning (30 September 2026): the story past, the tense in which stories and legends are told ("a long time ago, in a galaxy far, far away"). The suffix is built on the root qel-, as in qelin "to tell a story" and qelinnu "story"; this was an intentional choice in the conjugation rules. The suffix is always written \-qel and never changes shape, even in the irregular verb mittuu; in speech it is often softened to \-gel in some dialects.

The PGD's 1pl Speculative Past exceptionally uses \-nun. Because \-nun is otherwise the Perfect Past marker and the rest of the speculative-past paradigm uses \-qel, this is treated as a likely copy/paste error. The normalized SRD form uses \-qel.

### 5.5 Irregular native verbs

Two irregular native classes are encoded under the same "irregular" grammar-class value.

- **Irregular Voweled:** applies to vowel-final stems. Its 1sg present replaces final vowel material with \-da, \-ida or \-ada depending on environment.  
- **Irregular Unvowled:** applies to consonant-final stems. Its 1sg present appends \-ia.

Both classes first construct a person-marked stem and then use the shared TAM system.

## 6\. Loanword verb naturalisation

The PGD contains source-language-sensitive verb adaptation for Huttese, Ryl, Mando'a, Jawa, Tusken and an "other" class.

This is significant for the SRD language model. A borrowed verb is not necessarily copied unchanged. Instead:

1. identify the source-language class;  
2. naturalise the borrowed root into an Amatakka person-marked stem using the appropriate source template;  
3. apply the common Amatakka TAM morphology.

This agrees strongly with the established SRD model of contact-driven borrowing and permits old loans to become morphologically integrated while newer or culturally marked loans can retain more foreign structure.

## 7\. Phonology and orthography evidence

The PGD provides only limited explicit phonological information.

- Vowels: a e i o u y. This is strong internal evidence because the same set is repeatedly used in morphology regexes.  
- An author-note consonant string suggests m t k v n q s d y p g j r l, but this is incomplete relative to the larger dictionary and must not be treated as a closed consonant inventory.  
- The configured alphabetic sort order is likewise administrative and incomplete as a phoneme inventory.  
- The pronunciation subsystem explicitly records dt as an illegal cluster. This can be used as a soft SRD phonotactic constraint unless stronger inherited evidence contradicts it. A check on 29 September 2026 found no dt clusters anywhere in the dictionary.  
- No active romanisation guide, syllable generator, rewrite system or complete phoneme-level pronunciation guide is configured.

The PGD therefore does not supersede the separate SRD neography model. Traditional Amatakka writing remains a distinct consonant-heavy, limited-vowel system developed from the project's Tifinagh/Tatooine-substrate model.

## 8\. Comparison with the larger Amatakka Dictionary

The live Google Sheets dictionary was checked for morphology and grammatical forms relevant to the PGD rules. Vocabulary stored inside the PGD itself was excluded.

| Feature | Finding | Status |
| :---- | :---- | :---- |
| Masculine gender | PGD \-ka; dictionary \-ka explicitly male with Fialleril provenance and a broad derived family. | CONFIRMED |
| Feminine gender | PGD label produces \-ke; dictionary \-ku explicitly female, including mother/daughter/sister families and Fialleril evidence. | PGD LABEL CONFLICT. Use \-ku. |
| Gerian/fourth gender | PGD label produces \-ku; dictionary uses \-ke for fourth/other gender in the BLW-derived system. | PGD LABEL CONFLICT. Use \-ke. |
| Null/nonbinary | PGD \-ki; dictionary explicitly uses \-ki and contains several related forms. | CONFIRMED |
| Ungendered form | PGD permits no suffix; dictionary has many unmarked lemmas. | CONFIRMED |
| Regular verb citation form | PGD requires \-uu for the productive native regular class. Inherited dictionary verbs are not uniformly \-uu and are left as they are. All 55 "Jockles \- SRD" verbs now use \-uu citation forms: 52 were regularised on 29 September 2026, with the previous form recorded in the notes column. | SUPPORTED for SRD coinages; inherited forms unchanged |
| Subject agreement | PGD encodes 1/2/3 person × singular/plural inside the verb. Dictionary material contains independent ek, te, eta/ete/eti/etu and masuu/masu expressions (masuu is now the verb "to be": ek masa "I am", te masu "you are"). | COMPATIBLE BUT UNDERDOCUMENTED. The PGD supplies the productive SRD paradigm while independent pronouns remain valid. |
| TAM suffixes | \-tol, \-ker, \-bor, \-nao, \-nun, \-qel are not established as ordinary dictionary lexical entries. There is no lexical contradiction. | Treat as SRD grammatical morphology rather than retroactively attributing them to Fialleril or BLW. |
| Purposeful \-du | Dictionary evidence gives "purposefully/on purpose". | Keep separate from the TAM system. |
| Immediate/optative \-lu | Dictionary evidence gives "now / may this happen now". | Keep separate from tense morphology. |
| Conjunction \-e- | Dictionary evidence gives "and/additionally". | Keep as lexical/compound conjunction. |
| Loan integration | PGD has source-specific verb templates; the dictionary contains named Jawa, Ryl, Mando, Hutt and Tusken language material and many labelled loans. | STRONG CONCEPTUAL AGREEMENT |
| Phonotactic dt prohibition | Not contradicted; no dt clusters found in the dictionary. | Use as a soft SRD constraint; do not rewrite inherited forms solely to satisfy it. |

## 9\. Configuration anomalies and likely errors

- Feminine/Gerian mapping is reversed relative to stronger dictionary evidence.  
- Regular 1pl Speculative Past uses \-nun instead of the otherwise systematic \-qel; normalize to \-qel unless deliberate syncretism is later desired.  
- The configured alphabet/sort order is incomplete as a phoneme inventory.  
- The author-note consonant string is incomplete and cannot prohibit letters or digraphs established elsewhere.  
- Several regexes contain suspicious constructs such as \[^(ki)\] and a lookbehind-like string written as (/\<=k). These may not behave as intended in Java regex and should be tested before being treated as linguistic laws.  
- The grammarCollection is empty. PolyGlot therefore does not define canonical word order, negation placement, relative clauses, possession, question formation or argument marking.

## 10\. SRD authoritative grammar model after audit

1. Lexical authority remains the larger Amatakka Dictionary, with provenance preserved.  
2. New SRD vocabulary remains sourced exactly as "Jockles \- SRD".  
3. Gender morphology: \-ka masculine; \-ku feminine; \-ke Gerian/fourth-gender; \-ki null/nonbinary; unmarked permitted.  
4. New native SRD verbs use \-uu as the citation ending and the PGD person paradigm as the default SRD conjugation model. Consonant-final roots take \-uu directly (*ammat* → *ammatuu*); roots already ending in \-u add one \-u (*adzu* → *adzuu*); other vowel-final roots take \-uu directly (*aley* → *aleyuu*). Inherited verbs are not rewritten.  
5. TAM: \-tol present continuous; \-ker simple future; \-bor speculative future (SRD: distant hopeful future, the future after we are free); \-nao simple past; \-nun perfect past; \-qel speculative past (SRD: story past, built on root qel-).  
6. Normalize the 1pl speculative-past anomaly to \-qel.  
7. Use vowel-final and consonant-final irregular classes where a lexical item is explicitly irregular; do not force historical dictionary forms into a new regular shape.  
8. Borrowed verbs retain a source-language classification and use source-sensitive naturalisation where possible.  
9. For non-Amatakka Star Wars languages and vocabulary, The Complete Wermo's Guide remains the designated setting reference; slavery/contact history weights plausible loan pathways.  
10. For new native roots: existing Amatakka morphology first, then Tuareg, then other Berber/Amazigh, with Bantu influence especially relevant to the proposed old Tatooine/Jawa substrate.  
11. The PGD does not supersede the SRD neography model.  
12. The verb masuu is "to be" for identity and naming (revision of 30 September 2026). The earlier glosses "I have, I stand for, I represent" are withdrawn. The CANON forms masa (I am) and masu (you are) are kept as written; the verb is otherwise highly irregular (decision of 30 September 2026), because it is probably the most common word in the language, and it breaks the ordinary conjugation rules. Person endings: 1sg \-a, 2sg \-u, 3sg bare, 1pl \-ta, 2pl \-tu, 3pl \-en. Stems: mas- (present), han- (future and distant future), os- (past, perfect and story past). The continuous lengthens the stem vowel (maasa) instead of taking \-tol. The future and past use their stems alone, with no \-ker or \-nao. Smoothing: final \-n drops before a consonant; \-bor becomes \-vor in this verb only; \-qel never changes; the 3sg perfect takes \-i-; no triple consonants, and t is only followed by a vowel. Paradigm in the order present, continuous, future, distant future, past, perfect, story past: 1sg masa, maasa, hana, hanavor, osa, osanun, osaqel; 2sg masu, maasu, hanu, hanuvor, osu, osunun, osuqel; 3sg mas, maas, han, hanvor, os, osinun, osqel; 1pl masta, maasta, hanta, hantavor, osta, ostanun, ostaqel; 2pl mastu, maastu, hantu, hantuvor, ostu, ostunun, ostuqel; 3pl masen, maasen, hanen, hanevor, osen, osenun, oseqel.  
13. The verb mittuu is "to be, exist, endure" and is kept separate from masuu: masuu is identity and naming, mittuu is existence, presence and endurance. It is built on the CANON word mittu "endurance" and mitt-, since for the enslaved simply existing is endurance. It is IRREGULAR, because it is so common (decision of 30 September 2026). Present: 1sg mita, 2sg mituh, 3sg mit, 1pl mitta, 2pl mitru, 3pl mitek. Before a suffix: final \-h and \-k drop before a consonant; a single t between vowels at the suffix boundary becomes d (-tol becomes \-dol); \-ker becomes \-ger after a vowel, for this verb only and not spreading to other verbs; \-qel never changes; the 3sg takes \-i- before consonant-initial suffixes except \-tol (3sg continuous mittol); no triple consonants, and after t only t or r may follow. Full paradigm in the order continuous, future, distant future, past, perfect, story past: 1sg mitadol, mitager, mitabor, mitanao, mitanun, mitaqel; 2sg mitudol, mituger, mitubor, mitunao, mitunun, mituqel; 3sg mittol, mitiger, mitibor, mitinao, mitinun, mitiqel; 1pl mittadol, mittager, mittabor, mittanao, mittanun, mittaqel; 2pl mitrudol, mitruger, mitrubor, mitrunao, mitrunun, mitruqel; 3pl mitedol, miteger, mitebor, mitenao, mitenun, miteqel. The habitual prefix si- attaches as usual (si-mit). The verb tezruu "to hurt" was coined to stay well apart from it.  
14. Story past and distant future: \-qel is the tense of stories and legends, built on the root qel-. \-bor is the distant, hopeful future after we are free. Neither expresses doubt or guessing. Uncertainty is not a tense in SRD Amatakka.  
15. Numerals: the numbers 1 to 10 are tsi, top, sor, kuz, fus, dis, zas, tum, tiz and rew. rew is the free form of ten and \-rel its bound form, so N-rel means N tens (top-rel 20, kuz-rel 40, dis-rel 60, zas-rel 70, tum-rel 80, tiz-rel 90). sorel 30 is a lexical fusion of sor \+ rel, written with a single r; it is the one exception to the rule that doubled consonants are written. efin 50 and dekka 100 are irregular canon forms and the regular fus-rel and rew-rel are not used. 1000 is rekkat, an irregular word that is not built from dekka or \-rel, in the way English "thousand" is separate from "hundred". Ages, days and close kin are counted in thirties (N-sorel: top-sorel 60, sor-sorel 90); ordinary counting uses tens. The joiner \-e- "and" puts the larger number first (efin-e-tsi 51, rew-e-tsi 11, sorel-e-tsi 31). The number follows the noun, and the noun is plural from 2 upward.  
16. Zero, order and fractions (decided 5 October 2026): zero is kolak, which already meant nothing or empty. Order words add \-an to the number: soran third in line, kuzan fourth, fusan fifth, sorelan thirtieth. Second is toba and first is ebdan (from ebduu, to start); last is ereiban. N times is the number followed by toba: tsi toba once, top toba twice, sor toba three times. Fractions: half is xe, a quarter is xexe (half of a half), and a third has its own word, sorxe (a proposal, provisional until confirmed). Any other fraction is tsi plus the order word, so tsi fusan is a fifth and tsi tizan a ninth.  
17. Habitual aspect: the prefix si- (from si "way, a way of thinking, religion, teaching") marks what is done habitually, as a matter of custom. It combines with any tense: si-gama "I habitually sit", si-gamanao "I used to sit". It echoes the Mando'a idea of the Way.  
18. Source words: rap "so I was told" (reported), ji "I saw it myself" (witnessed) and lev "I feel it in my heart" (felt or intuited) are short words placed at the end of a clause. They are never required. They work as intensifiers or clarifiers, making a statement firmer or clearer about where it came from. The three are also foundational roots for vocabulary about storytelling, learning and sharing information.

## 11\. Grammar still not defined by the PGD

The following remain open design areas: default word order; adjective position; possession beyond lexical evidence; plural noun morphology; case/adpositions; negation syntax; interrogative syntax; relative/subordinate clauses; how the source words rap, ji and lev combine with questions and negation; imperative morphology; copular omission in the present tense (masuu is now the verb "to be"; whether it may be dropped, as in mattama ek, is open); and interaction of independent pronouns with verb agreement.

These should be developed from existing dictionary phrases and source texts before wholly new rules are invented.

To do on this project. NEXT: define zero, ordinals (as a numeral suffix), fractions (tied to the three moons) and calendar words (day, week, month, year, once the moon-cycle length is settled); the khepi "time" and asagi "season" candidates belong to this step. STILL TO DO: design the counting gestures in the same tap-based, species-neutral style as the courtesy gestures. FOR THE ORTHOGRAPHY STEP: the contrasts masa/maasa and mita/mitta are important and must be kept clearly differentiated when the orthography rules are set.

## 12\. Revision log — 29 September 2026

Applied from the Part I Continuity Check:

- 52 "Jockles \- SRD" verbs regularised to \-uu citation forms (rule 4). The three already in \-uu were unchanged.  
- Gender glosses for *amavikka-ke* and *nimke* aligned with the \-ke \= Gerian/fourth-gender rule.  
- *Bishneq* marked canon-layer only, since the Tusken massacre does not occur in The Small Rain Down.  
- *maratt* annotated with its SRD usage (Anakin's word for other Jedi Masters, never for Obi-Wan).  
- Trailing spaces removed from part-of-speech and source labels (523 cells).

Still open: 45 entries without a source need provenance before being relied on, and the "Hand signal / gesture" column is still empty although the story uses hand signals.

## Appendix A. Regular verb TAM matrix

The normalized productive pattern combines the person-marked present stem with:

- Present Continuous \-tol  
- Simple Future \-ker  
- Speculative Future \-bor  
- Simple Past \-nao  
- Perfect Past \-nun  
- Speculative Past \-qel

Regular present bases are:

- 1sg \-a  
- 2sg \-uh  
- 3sg stem-conditioned  
- 1pl \-ta  
- 2pl \-tu  
- 3pl stem-conditioned

Third-person regular stems have additional stem-final alternations encoded by regex rather than one invariant suffix. The source PGD's 1pl speculative past uses \-nun and is normalized to \-qel in the SRD model.

## Appendix B. Provenance

This document describes rules encoded in the supplied PolyGlot file and their relationship to the project's larger Amatakka Dictionary. It does not attribute the PGD's newly encoded grammar to Fialleril, BLW or another fan creator unless independently supported by the dictionary. Where this grammar becomes part of The Small Rain Down's productive language model, it should be treated as SRD/Jockles development unless a prior source is identified.

Revision note, 30 September 2026: masuu is now the verb "to be". Updated the subject-agreement row in section 8, the open-grammar list in section 11 and added rule 12 to section 10\. The dictionary entries for masuu, mattama ek and te masu were revised to match.

Second revision note, 30 September 2026: added the rules for mittuu, the story past \-qel (root qel-), the distant hopeful future \-bor, the habitual prefix si-, and the optional source words rap, ji and lev. The dictionary gained entries for mittuu, tezruu, si-, \-qel and \-bor, and notes on rap, ji, lev, qelin, qelinnu, masuu, mitt- and mittu.

Third revision note, 30 September 2026: mittuu is now irregular (present mita, mituh, mit, mitta, mitru, mitek, with the smoothing rules and full paradigm in section 10). \-qel is fixed as written, with a note that it is often softened to \-gel in speech in some dialects.

Fourth revision note, 30 September 2026: masuu is now highly irregular, with the stems mas-, han- and os-, a lengthened-vowel continuous, and the smoothing rules recorded in section 10 (masa, masu unchanged). The dictionary note for masuu was updated to match.

Fifth revision note, 30 September 2026: the numeral system was decided (see the numerals paragraph in section 10). Numbers 1 to 10 are single syllables (tsi, top, sor, kuz, fus, dis, zas, tum, tiz, rew), \-rel is the bound form of ten, and sorel "thirty" is a lexical fusion written with one r. The old forms kerad, ukuz and semus were retired, and the courtesy phrases boralu, paduu ek, kou?, aleg kou and mai mituh were added to the dictionary.

Sixth revision note, 30 September 2026: efin 50 and dekka 100 are confirmed as fialleril canon. "You're welcome" is dakkalu (everyday) and kel depu (formal, for a serious favour); kel tapa is dropped. The spelling of han, the future stem of masuu, is intentionally like the name Han (an in-joke, like the myth's leia and lukka). The word "attested" was replaced by the four source tiers (CANON, ESTABLISHED, SRD, CANDIDATE). Open items are recorded in section 11\.

Seventh revision note, 5 October 2026: zero, order words and fractions were decided (see the paragraph after the numerals paragraph in section 10). Zero is kolak. The ordinal ending is \-an, with toba for second and ebdan for first. N times is the number plus toba. Half is xe, a quarter is xexe, a third has its own word (sorxe, proposed and provisional) and other fractions are one plus the ordinal.

Eighth revision note, 5 October 2026: in the present tense, masuu can be folded into a describing word as an ending: \-ma (I am), \-mu (you are), \-mas (he, she or it is), as in matta \+ ma \= mattama "I am fine". The ending shows the person, so the pronoun is normally dropped. Plural endings are \-mata (we), \-matu (you all) and \-masen (they), confirmed later the same day; the third person keeps its s. The word order direction for these sentences is description, verb, person ("fine am I", "good was he"). This is a provisional direction that feeds the open default word order item in section 11\. Other tenses keep the full verb masuu after the description. Task 16 (copular omission) is closed.

Ninth revision note, 5 October 2026: the year and its stretches were decided. The year is ar-ewel (ar- great \+ ewel, a turn from eweluu), replacing asagas. It runs from one marokkepu (the day all three moons are full) to the next, about ten moon-rounds of thirty days. Published Tatooine sources give no seasons, so these are our assumptions: the great drought araplu (long dry stretch), the great mist arail (humid build-up before the new year), then marokkepu itself, then the mighty storm arumak (sandstorm stretch). Each is ar- plus a clipped root (aplu from aplutu, ail from aila, umak from umakkar). The lengths were later confirmed as six, three and one moon-rounds (see the twelfth revision note). Month, ten-day stretch, day words and the khepi and asagi candidates are still open under to-do item 2\.

Tenth revision note, 5 October 2026: the month is sorlev (a rounded form of sorel-lev, thirty moon), one round of the moons. khepi (time, hour) and asagi (season, the general word) were accepted from the Candidates review. The ten-day stretch is to be a single new word rather than a compound; the user chose to give it, and the morning and evening words, new Berber and Tuareg-informed vocabulary. These are still open under to-do item 2\.

Eleventh revision note, 5 October 2026: three new nouns were chosen from options shaped on Berber and Tuareg ideas, not copied from them. usanna is a stretch of ten days, three to a sorlev. tagasu is morning and tamettu is evening. Dawn and dusk stay haro, noon stays khepatag and night stays nittu. The earlier proposals kashka-rel, haro kashka and haro nittu are withdrawn. Still open under to-do item 2: today, yesterday and tomorrow (the year split was then confirmed, see the twelfth revision note).

Twelfth revision note, 5 October 2026: the year split was confirmed as six, three and one moon-rounds (sorlev): araplu (the great drought) six, arail (the great mist) three, and arumak (the mighty storm) one, with marokkepu falling at the join between arail and arumak. These add up to the ten sorlev of an ar-ewel. This replaces the earlier six, two and two.

Thirteenth revision note, 5 October 2026: days relative to now take the verb time endings on kashka (day): kashkalu today, kashkanao yesterday, kashkaker tomorrow, kashkabor the day after we are free, and kashkaqel once upon a time. The question of calendar and time words (to-do item 2\) is now closed.