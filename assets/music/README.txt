WEATHER MUSIC
=============
The game plays a playlist from the folder that matches the weather button you press:

  assets/music/snow/   - Snow button
  assets/music/fog/    - Fog button

Shipped here are only recordings that are legal to redistribute (public domain / CC BY, see CREDITS.md).
Songs such as "Last Christmas", "Let It Snow" or Viktor Tsoi's instrumentals are NOT free to redistribute,
so they are not in the repository - but you can drop your own copies in and the game picks them up:

  1. Copy your .mp3 files into the folder (snow or fog).
  2. Name them like this (any of these names, or simply 1.mp3 ... 9.mp3), nothing else to edit:

     snow/  last-christmas.mp3   let-it-snow.mp3   jingle-bells.mp3
     fog/   spokoynaya-noch.mp3  pachka-sigaret.mp3  gruppa-krovi.mp3  zvezda-po-imeni-solntse.mp3
            kukushka.mp3  peremen.mp3  krasno-zheltye-dni.mp3  posledniy-geroy.mp3  sentyabr.mp3  trolleybus.mp3

  3. Any other file name works too if you list it in manifest.json of that folder ("tracks": [{"file":"x.mp3","name":"Title"}]).

If the fog folder has your own tracks, the built-in calm fallback piece is not used.
In-game you can also add any file to the speaker (the speaker button) - that is stored in your browser.
