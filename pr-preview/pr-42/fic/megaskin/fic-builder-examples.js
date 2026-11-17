// The tutorial's example chats, for "Load an example" in the Fic Builder.
// Each one is plain data:
//   cast:  the people in it: profile (a profile from the skin, like "shane"), or name plus
//          colour, initials, pic, alt, num for one-offs
//   chat:  the chat settings (type is "imsg" or "wa"; pov is whose phone it is)
//   msgs:  one line per message: [who, text, extras]. who is a cast name, "sys" for a
//          date or notice line, or "typing". extras can have time, tick, reacts (iMessage
//          tapbacks: [[who, emoji]]), waReacts, waCount, sms, big, edited, status,
//          reply (the number of an earlier message, counting from 0; in a tweet thread, the reply
//          goes to whoever posted it, and with no reply it goes to the tweet just above), photos, link.
//          Tweets also take verified, label, date, reposts, reposted, likes, liked, replies, poll,
//          pollinfo, qName, qHandle, qText, note, warn, vUrl, vTitle, vDesc. Twitter/X DMs take voice;
//          Instagram DMs take shared. An Instagram post's settings are in chat, and its msgs are comments.
(function () {
var CAT1 = "https://images.squidge.org/images/2026/11/16/Cat1.jpg";
var CAT2 = "https://images.squidge.org/images/2026/11/16/Cat2.jpg";
var CAT3 = "https://images.squidge.org/images/2026/11/16/Cat3.jpg";
var CAT4 = "https://images.squidge.org/images/2026/11/16/Cat4.jpg";
var ALT1 = "Black and white cat staring through a gap between a screen and a desk, with blurred cables hanging down around and blue sky behind";
var ALT2 = "Black and white cat screaming at the camera, on a red patterned rug";
var ALT3 = "Black and white cat holding out a paw daintily, on a beige and green cat tree. The cat looks to be stepping into the frame from the left";
var MACK = "https://64.media.tumblr.com/c3c4ecb5bfed8fa9f0590c54206ddb30/cff2318529321620-44/s1280x1920/42befcc40a517e1f202dda40783be2ffb95c1d92.pnj";
var MACKALT = "Macklin Celebrini at the IHF Worlds, dressed in his red jersey and black helmet. He's surrounded by sparkles, a red vignette, and hearts containing the Canadian flag";
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
      ["typing", ""]
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
      ["typing", "Lily is typing..."]
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
  },
  {
    label: "Twitter/X: a tweet and its replies",
    cast: [{ name: "Zim", profile: "zim" }, { name: "Holster", profile: "holster" },
      { name: "Sam", handle: "samthecat", pic: CAT2, alt: "Profile picture of samthecat, a black and white cat screaming at the camera" },
      { name: "Stan", profile: "stan" }, { name: "Rose", profile: "rose" }],
    chat: { type: "twthread", bar: "empty" },
    msgs: [
      ["Zim", "Reminder to everyone that there could be (and likely are) queer players on many of the teams that didn't pledge. Thoughts go out to them. #HunterShortlist @SHunter",
        { time: "3h", date: "8:23 AM · 11 May 23", reposts: "580", reposted: true, likes: "2.6k", liked: true, replies: "10" }],
      ["Holster", "I played all through college with a guy whose boyfriend was also on the team. That man now plays professionally. This is not the whole story of queer hockey.", { time: "2h" }],
      ["Sam", "this is lovely. anyway feed me", { time: "1h" }],
      ["Stan", "Settle something for me while we're all here. Who's got the cup this year?", { time: "45m", reply: 0, poll: "Montreal\nBoston", pollinfo: "179 votes · 13 minutes left" }],
      ["Rose", "The Ottawa crowd last night 🏳️‍🌈", { time: "30m", reply: 0, photos: [{ url: CAT1, alt: ALT1 }, { url: CAT2, alt: ALT2 }] }],
      ["Stan", "Rose those are cats.", { time: "20m" }]
    ]
  },
  {
    label: "Twitter/X: a timeline of tweets",
    cast: [
      { name: "Hockey Fan", handle: "hockeyfan", pic: "https://images.squidge.org/images/2026/11/16/HockeyBlur.png", alt: "Profile picture of hockeyfan, a blurred photo of a hockey game" },
      { name: "Scott Hunter", handle: "SHunter", colour: "6", initials: "SH" },
      { name: "Yuna", profile: "yuna" },
      { name: "Sharks or Swim", handle: "SharksSwim", pic: "https://images.squidge.org/images/2026/11/16/Goalie.png", alt: "Profile picture of SharksSwim, a hockey goalie" },
      { name: "Pace Off", handle: "Pace_Off_Puckers", pic: "https://images.squidge.org/images/2026/11/16/Goal.png", alt: "Profile picture of Pace_Off_Puckers, a hockey goal" },
      { name: "Jockles", handle: "jockles25", colour: "8", initials: "J" },
      { name: "Geri", handle: "Geronimum", colour: "2", showInitials: false }
    ],
    chat: { type: "twfeed" },
    msgs: [
      ["Hockey Fan", "Can't believe that overtime goal.", { time: "2h", reposts: "3", likes: "13", replies: "1" }],
      ["Scott Hunter", "no comment. #NoComment", { time: "5m", verified: true, qName: "Reporter", qHandle: "sportsdesk", qText: "Sources say the trade is happening.",
        note: "Readers added context: the trade has not been confirmed.", reposts: "912", likes: "8,204", replies: "77" }],
      ["Yuna", "Cat sitting again.", { time: "2h", label: "Only people in @MetrosMomager's Twitter Circle can see this Tweet.",
        photos: [{ url: CAT1, alt: ALT1, land: true }, { url: CAT2, alt: ALT2 }, { url: CAT3, alt: ALT3, land: true }, { url: CAT4, alt: ALT4 }] }],
      ["Sharks or Swim", "My Captain.", { time: "2h", photos: [{ url: MACK, alt: MACKALT }] }],
      ["Pace Off", "Last Metros game of the regular season and @SHollanderHockeyPlayer looks miserable.", { time: "3h", photos: [{ desc: "Shane Hollander looking tired at a press conference" }] }],
      ["Jockles", "Ilya Rozanov you will always be famous to me", { time: "2h", vUrl: "https://player.vimeo.com/video/1169167060?badge=0&autopause=0&player_id=0&app_id=58479",
        vTitle: "Ilya Rozanov | Come Home", vDesc: "Video: a tribute edit of Ilya Rozanov, made from Heated Rivalry footage and set to \"Would You Come Home\" by Tyler Blackburn" }],
      ["Hockey Fan", "Who's got the cup this year?", { time: "1d", poll: "Montreal 75%\nBoston 25%", pollinfo: "97 votes · Final results" }],
      ["Geri", "Rink at night vs rink in the morning. Guess which one I prefer", { time: "4h", warn: true,
        photos: [{ desc: "A photo of the empty rink at night" }, { desc: "A photo of the same rink at 6am, full of children in helmets" }] }]
    ]
  },
  {
    label: "Twitter/X: a one-to-one DM",
    cast: [{ name: "Ilya", profile: "ilya" }, { name: "Shane", profile: "shane" }],
    chat: { type: "twdm", pov: "Ilya", bar: "empty" },
    msgs: [
      ["Shane", "saw your tweet"],
      ["Ilya", "it was meant to be funny"],
      ["Shane", "it wasn't", { time: "10:14 PM" }],
      ["Ilya", "it was a little bit funny", { time: "10:15 PM" }],
      ["Shane", "ok it was a little bit funny", { waReacts: "😏", waCount: "1" }],
      ["Ilya", "I am always funny", { waReacts: "🙄", waCount: "1" }],
      ["Shane", "", { photos: [{ url: MACK, alt: MACKALT }] }],
      ["Ilya", "", { photos: [{ desc: "A photo of Ilya pulling a face at the camera" }] }],
      ["Ilya", "", { voice: "0:02", time: "10:21 PM" }]
    ]
  },
  {
    label: "Twitter/X: a group DM",
    cast: [{ name: "Ilya", profile: "ilya" }, { name: "Hayden" }, { name: "Shane", profile: "shane" }, { name: "Scott" }],
    chat: { type: "twdm", pov: "Ilya", group: true, title: "Rookie Dinner", sub: "4 people", bar: "empty" },
    msgs: [
      ["Hayden", "are we still going out?", { waReacts: "👍 😂", waCount: "3" }],
      ["Shane", "yes. Ilya is paying"],
      ["Ilya", "I did not agree to this"],
      ["Scott", "you did, actually. there are witnesses", { time: "7:02 PM" }]
    ]
  },
  {
    label: "Instagram: a full post",
    cast: [{ name: "Ilya", profile: "ilya" }, { name: "Shane", profile: "shane" },
      { name: "Scott", ighandle: "scott.h", land: true, alt: "Profile picture of scott.h",
        pic: "https://media.istockphoto.com/id/2172051553/photo/asiatic-lily.jpg?s=1024x1024&w=is&k=20&c=3vCuZD234XmkXzrnzWPBdIZM0oJA1B6qe1x-06K_wDo=" },
      { name: "Jane", ighandle: "jane_t", land: true, alt: "Profile picture of jane_t",
        pic: "https://www.shutterstock.com/shutterstock/photos/1100283806/display_1500/stock-photo-beautiful-lavender-flower-in-the-dalat-flower-park-selective-focus-1100283806.jpg" }],
    chat: { type: "igpost", from: "Ilya", scroll: "no-scroll", menu: true, story: true, verified: true, follow: true, underKind: "song", under: "Boney M. - Rasputin",
      photo: { url: MACK, alt: MACKALT, desc: "" }, likes: "2,431", likeClick: true, cmCount: "84", reposts: "12", shares: "7", saveClick: true,
      likesLine: "faces", faces: ["Shane", "Scott", "Jane"], caption: "early skate #nofilter", viewAll: true, time: "3 hours ago" },
    msgs: [
      ["Shane", "why are you awake"],
      ["Scott", "I see you 👀"]
    ]
  },
  {
    label: "Instagram: a simpler post",
    cast: [{ name: "Rose", profile: "rose" }, { name: "Ilya", profile: "ilya" }],
    chat: { type: "igpost", from: "Rose", menu: true, underKind: "location", under: "Ottawa, Ontario",
      photo: { url: "", alt: "", desc: "A photo of a very large lasagne, with one corner already missing" }, likes: "312", cmCount: "2", shares: "1",
      likesLine: "count", caption: "made enough for the whole committee. nobody came. #galaprep", time: "20 minutes ago" },
    msgs: [
      ["Ilya", "I am coming now"]
    ]
  },
  {
    label: "Instagram: a one-to-one DM",
    cast: [{ name: "Ilya", profile: "ilya" }, { name: "Shane", profile: "shane" }],
    chat: { type: "igdm", pov: "Ilya", sub: "Active now" },
    msgs: [
      ["Shane", "you replied to my story"],
      ["Ilya", "I did not"],
      ["Shane", "Shared a story from @shanehollanderhockeyplayer: \"6am skate. Again.\"", { shared: true }],
      ["Shane", "this story. you replied with a heart"],
      ["Ilya", "ok maybe I did", { status: "Seen" }]
    ]
  },
  {
    label: "Instagram: a group DM",
    cast: [{ name: "Ilya", profile: "ilya" }, { name: "Rose", profile: "rose" }, { name: "Shane", profile: "shane" }],
    chat: { type: "igdm", pov: "Ilya", group: true, title: "gala committee 🥂", sub: "Active 2h ago" },
    msgs: [
      ["Rose", "the lasagne is still here if anyone wants it"],
      ["Shane", "on my way"],
      ["Ilya", "I already ate half of it", { status: "Seen by 3" }]
    ]
  }
];
})();
