const text = document.querySelector(".from input");
const translatedText = document.querySelector(".to input");
const fromBtn = document.querySelector("#fromBtn");
const toBtn = document.querySelector("#toBtn");
const dropdowns = document.querySelectorAll("select");
const transbtn= document.querySelector("#translate");
const fromLang = document.querySelector(".from select");
const toLang = document.querySelector(".to select");

for (let select of dropdowns) {
    for (let lang in langCodes) {
        let newOption = document.createElement("option");
        newOption.innerText = lang;        
        newOption.value = langCodes[lang]; 
        select.append(newOption);

        if(select.name=== "from" && lang=== "English"){
            newOption.selected="selected";
        }
        else if(select.name=== "to" && lang=== "Hindi"){
            newOption.selected="selected";
        }
    }
}

transbtn.addEventListener("click", async ()=>{
    const URL = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.value)}&langpair=${fromLang.value}|${toLang.value}`;
    const response = await fetch(URL);
    const data = await response.json();
    translatedText.value= data.responseData.translatedText;

});

fromBtn.addEventListener("click", (evt) => {
    evt.preventDefault();
    if (text.value !== "") {
        let utterance = new SpeechSynthesisUtterance(text.value);
        utterance.lang= fromLang.value;
        speechSynthesis.speak(utterance);
    }
});

toBtn.addEventListener("click", (evt) => {
    evt.preventDefault();
    if (text.value !== "") {
        let utterance = new SpeechSynthesisUtterance(translatedText.value);
        utterance.lang= toLang.value;
        speechSynthesis.speak(utterance);
    }
});