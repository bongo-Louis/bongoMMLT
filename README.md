# bongoMMLT
bongo's maimai larp tracker (MMLT for short), is a simple web application i developed out of sheer hyperfixated rage during the recent november 2026 allnet outage.

<img src="https://i.ibb.co/Txp3kwWD/HWv3-P33b-IAAGx-Pc.jpg" alt="HWv3P33b IAAGx Pc" border="0">

## the website itself
its hosted on github, i dont expect this project to blow up? so both my cloudinary and firebase instances are set up with the free plan, feel free to try it out tho
https://bongo-louis.github.io/bongoMMLT/

## why CC0 license?
the main aim of this project was to have a better understanding of firebase auth, db as well as (because i needed it) cloudinary's sdk and api respectively. i wanted to try and understand tailwind too? 

how did i do that? [ai assisted pair programming](https://www.ibm.com/think/topics/ai-pair-programming)

hence in light of this, although i now know a good chunk of how the html, css and js works...

i cant morally call this project my own, so feel free to do whatever
(that and i honestly still need to understand tailwind, i just ended up editing my input.css file anyway)

hence why there the word "larp" in the name

## how does this website work

key in your credentials > firebase checks for an account first > if you are a user, retrieve your json data > puts it in state memory, sort rating score, map each score into scoretemplate(), join the html together put it inside score list

alot of firebase updating is done for score uploads, and name changes

uploading a picture, js checks if its any of the supported file types and then makes sure its under 2mb, the file is then fetched to cloudinary, it resizes it to 320x320, gives it a public id yayyyy then the result is a img url that we also update to the db and render

that should be all lowk

clicking on the leaf emoji lets u like, go to my carrd.co i guess...


 
