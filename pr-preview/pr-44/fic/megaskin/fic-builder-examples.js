// The tutorial's example chats, for "Load an example" in the Fic Builder.
// Each one is plain data:
//   cast:  the people in it: profile (a profile from the skin, like "shane"), or name plus
//          colour, initials, pic, alt, num for one-offs
//   chat:  the chat settings (type is "imsg" or "wa"; pov is whose phone it is)
//   msgs:  one line per message: [who, text, extras]. who is a cast name, "sys" for a
//          date or notice line, or "typing" for typing dots (by: who is typing). extras can have time, tick, reacts (iMessage
//          tapbacks: [[who, emoji]]), waReacts, waCount, sms, big, edited, status,
//          reply (the number of an earlier message, counting from 0), photos, link.
(function () {
var CAT1 = "https://images.squidge.org/images/2026/11/16/Cat1.jpg";
var CAT2 = "https://images.squidge.org/images/2026/11/16/Cat2.jpg";
var CAT3 = "https://images.squidge.org/images/2026/11/16/Cat3.jpg";
var CAT4 = "https://images.squidge.org/images/2026/11/16/Cat4.jpg";
var ALT1 = "Black and white cat staring through a gap between a screen and a desk, with blurred cables hanging down around and blue sky behind";
var ALT2 = "Black and white cat screaming at the camera, on a red patterned rug";
var ALT3 = "Black and white cat holding out a paw daintily, on a beige and green cat tree. The cat looks to be stepping into the frame from the left";
var ALT4 = "Black and white cat sitting in an opened red suitcase, carry on size, on the floor behind a white door, and on a red patterned rug";

window.FB_EXAMPLES = [
  {
    label: "iMessage: a one-to-one chat",
    cast: [{ name: "Shane", profile: "shane" }, { name: "Ilya", profile: "ilya" }],
    chat: { type: "imsg", pov: "Shane", title: "Ilya", sub: "iMessage", bar: "empty" },
    msgs: [
      ["sys", "Today 11:48 PM"],
      ["Ilya", "are you awake"],
      ["Shane", "no"],
      ["Ilya", "liar", { reacts: [["Shane", "😂"]] }],
      ["Shane", "ok yes. go to sleep, you have a game tomorrow", { reacts: [["Ilya", "👎"]] }],
      ["Ilya", "cannot sleep. hotel is too quiet. but there is a cat"],
      ["Ilya", "", { photos: [{ url: CAT4, alt: "A cat curled up inside an open suitcase" }] }],
      ["Ilya", "", { photos: [{ desc: "A blurry photo of the same cat, now asleep on Ilya's hotel bed" }] }],
      ["Shane", "call me?", { status: "Read 11:52 PM" }],
      ["typing", "", { by: "Ilya" }]
    ]
  },
  {
    label: "iMessage: a group chat",
    cast: [{ name: "Shane", profile: "shane" }, { name: "Hayden" }, { name: "Scott" }, { name: "Max" }, { name: "Ryan" }, { name: "Wyatt" }, { name: "Ilya", profile: "ilya" }],
    chat: { type: "imsg", pov: "Shane", group: true, title: "gays and europeans (and hayden)", sub: "iMessage group", bar: "empty" },
    msgs: [
      ["sys", "Today 6:12 AM"],
      ["Hayden", "day two of camp. who's awake"],
      ["Scott", "unfortunately me"],
      ["Shane", "been up since 5. the cones are in my car"],
      ["Max", "do we have enough pucks for the little ones or do I need to stop by the rink office"],
      ["Max", "also some kid left a mouthguard in my bag yesterday. gross"],
      ["Shane", "can't check, the signal in this rink is terrible", { sms: true }],
      ["Shane", "these are going as texts. it's like 2009 in here", { sms: true }],
      ["Ryan", "I've got the pucks. and the orange slices"],
      ["sys", "Ilya added Wyatt to the conversation"],
      ["Wyatt", "👋"],
      ["Scott", "reminder that nobody is letting Ilya run the drills again", { reacts: [["Shane", "😂"], ["Hayden", "‼️"], ["Ryan", "👍"]] }],
      ["Shane", "the kids loved it though", { reacts: [["Ilya", "❤️"], ["Scott", "👎"]] }],
      ["Ilya", "they loved me. I am the fun coach"],
      ["Max", "you made a nine year old cry"],
      ["Wyatt", "I thought I was the fun coach.", { reacts: [["Ilya", "👎"]] }]
    ]
  },
  {
    label: "WhatsApp: a one-to-one chat",
    cast: [{ name: "Shane", profile: "shane" }, { name: "Ilya", profile: "ilya" }], // Ilya is saved as Lily on Shane's phone
    chat: { type: "wa", pov: "Shane", title: "Lily", sub: "online", bar: "empty" },
    msgs: [
      ["sys", "YESTERDAY"],
      ["Ilya", "are you still up?", { time: "23:41" }],
      ["Shane", "unfortunately", { time: "23:42" }],
      ["Shane", "can't stop thinking about tomorrow", { time: "23:42" }],
      ["Ilya", "you'll be great. you always are", { time: "23:43", waReacts: "❤️" }],
      ["sys", "TODAY"],
      ["Shane", "it's done. I'm alive", { time: "14:05" }],
      ["Ilya", "TELL ME EVERYTHING", { time: "14:05" }],
      ["Shane", "after snacks. I'm starving", { time: "14:06", reply: 7 }],
      ["Ilya", "so proud of you", { time: "14:07", reply: 6 }],
      ["Ilya", "", { time: "14:12", link: { url: "https://fakehockeynews.com", title: "Captain Mack", desc: "All the reasons Mack deserves the C",
        img: "https://64.media.tumblr.com/c3c4ecb5bfed8fa9f0590c54206ddb30/cff2318529321620-44/s1280x1920/42befcc40a517e1f202dda40783be2ffb95c1d92.pnj",
        alt: "Macklin Celebrini at the IHF Worlds, dressed in his red jersey and black helmet. He's surrounded by sparkles, a red vignette, and hearts containing the Canadian flag" } }],
      ["Ilya", "also someone made me a fan video. I am very handsome in it", { time: "14:13", link: { url: "https://vimeo.com", title: "Ilya Rozanov | Come Home",
        video: "https://player.vimeo.com/video/1169167060?badge=0&autopause=0&player_id=0&app_id=58479",
        imgdesc: "Video: a tribute edit of Ilya Rozanov, made from Heated Rivalry footage and set to \"Would You Come Home\" by Tyler Blackburn" } }],
      ["Shane", "🙄", { time: "14:15", big: true }],
      ["Shane", "", { time: "14:20", link: { url: "https://recipes.example.com/pierogi", showUrl: true, title: "Pierogi from Scratch", desc: "Easier than you think",
        imgdesc: "The page's picture: a plate of golden fried pierogi with sour cream" } }],
      ["Shane", "making these tonight if you're coming over", { time: "14:20" }],
      ["Shane", "", { time: "14:22", waReacts: "😍", photos: [{ url: CAT3, alt: ALT3, land: true }, { url: CAT4, alt: ALT4 }] }],
      ["Ilya", "she says she wants pierogi too", { time: "14:24", photos: [{ url: CAT2, alt: ALT2 }] }],
      ["typing", "", { by: "Ilya" }]
    ]
  },
  {
    label: "WhatsApp: a group chat",
    cast: [
      { name: "Ilya", profile: "ilya" },
      { name: "Rose", profile: "rose" },
      { name: "Hayden", colour: "4", initials: "HP" },
      { name: "Shane", profile: "shane" } // saved as Jane on Ilya's phone
    ],
    chat: { type: "wa", pov: "Ilya", group: true, header: "bar", title: "dinner", sub: "Rose, Jane, Hayden, You", bar: "empty" },
    msgs: [
      ["sys", "TODAY"],
      ["sys", "Rose changed this group's icon"],
      ["Rose", "DINNER PARTY. my place, saturday at 7 🥂", { time: "09:12" }],
      ["Rose", "I'm doing the lamb!!! everyone has to come", { time: "09:12", waReacts: "🎉", waCount: "2" }],
      ["Hayden", "should I bring the kids?", { time: "09:13" }],
      ["Ilya", "yes. they are better company than you", { time: "09:14", reply: 4, waReacts: "❤️ 😂", waCount: "3" }],
      ["Shane", "be nice", { time: "09:15", reply: 5 }],
      ["Ilya", "what do we bring?", { time: "09:16", reply: 2 }],
      ["Rose", "", { time: "09:18", photos: [{ desc: "Photo of a bottle of red wine with a gold label and a very long French name" },
        { desc: "Photo of the same bottle, held up next to Rose's very pleased face" }] }],
      ["Rose", "", { time: "09:19", photos: [{ url: CAT1, alt: ALT1, land: true }, { url: CAT2, alt: ALT2 }, { url: CAT3, alt: ALT3, land: true }, { url: CAT4, alt: ALT4 }] }],
      ["Rose", "the girls are devastated they're not invited 😿", { time: "09:19" }],
      ["Ilya", "Shane will not drink this. more for me", { time: "09:20" }]
    ]
  }
];
})();
