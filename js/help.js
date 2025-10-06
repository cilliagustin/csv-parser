console.log("help.js loaded 🤠");

// Cowboy-style tutorial steps
const helpSteps = [
  {
    title: "1 of 10",
    text: "Howdy partner! 🤠 I ain’t got a name, but I’m yer trusty guide today. We’re gonna wrangle this CSV and turn it into somethin’ clean ‘n shiny. Let’s ride!",
    img: "media/6.png",
  },
  {
    title: "2 of 10",
    text: "First thing, cowboy — upload that CSV right there. Click on that file chooser and lasso your data in. Yeehaw!",
    img: "media/2.png",
  },
  {
    title: "3 of 10",
    text: "Now let’s map the name column. Could be one or two columns. If it’s just one, I can fix up the order for ya — make it First Name then Last Name, nice ‘n proper.",
    img: "media/6.png",
  },
  {
    title: "4 of 10",
    text: "Time to pick the phone number, buckaroo! This one’s easy — just select the column that’s got the numbers. Make sure they’re real ones, not tumbleweeds!",
    img: "media/7.png",
  },
  {
    title: "5 of 10",
    text: "Next up, the timestamp. Choose the column that’s got the date and tell me how it’s formatted. Is it day first? Month first? We’ll make it good ol’ D/MM/YYYY for the output.",
    img: "media/8.png",
  },
  {
    title: "6 of 10",
    text: "Now we’re wranglin’ message direction. Pick the column that shows if a message is inbound or outbound, and tell me what words your CSV uses for each.",
    img: "media/2.png",
  },
  {
    title: "7 of 10",
    text: "Don’t map nothin’ here, cowboy. Just type what yer preferred channel number’s gonna be — that’s the number folks send messages from.",
    img: "media/9.png",
  },
  {
    title: "8 of 10",
    text: "Time to map the message body, partner! This one’s a cinch — just pick the column that holds what folks actually said.",
    img: "media/10.png",
  },
  {
    title: "9 of 10",
    text: "This is the hard part, partner. 😔 There might be some errors in that CSV you passed along. Ain’t your fault — but I just can’t map ’em right. You’ll see ’em here plain as day… best to let those rowdy ones go and keep ridin’ forward.",
    img: "media/5.png",
  },
  {
    title: "10 of 10",
    text: "All done! Hit that export button and I’ll rustle up your shiny new CSVs, neat and tidy, faster than a prairie wind. 🤠",
    img: "media/4.png",
  },
];

// Elements
const helpBtn = document.getElementById("helpBtn");
const helpModal = new bootstrap.Modal(document.getElementById("helpModal"));
const helpStepTitle = document.getElementById("helpStepTitle");
const helpStepText = document.getElementById("helpStepText");
const helpMascot = document.getElementById("helpMascot");
const prevHelp = document.getElementById("prevHelp");
const nextHelp = document.getElementById("nextHelp");

let currentStep = 0;

// Renders current step
function renderStep() {
  const step = helpSteps[currentStep];
  helpStepTitle.textContent = step.title;
  helpStepText.textContent = step.text;
  helpMascot.src = step.img;

  prevHelp.disabled = currentStep === 0;
  nextHelp.textContent =
    currentStep === helpSteps.length - 1 ? "Finish" : "Next";
}

// Button actions
helpBtn.addEventListener("click", () => {
  currentStep = 0;
  renderStep();
  helpModal.show();
});

nextHelp.addEventListener("click", () => {
  if (currentStep < helpSteps.length - 1) {
    currentStep++;
    renderStep();
  } else {
    helpModal.hide();
  }
});

prevHelp.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
});
