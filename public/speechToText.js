// filepath: public/js/speechToText.js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

recognition.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  console.log("Spoken Text:", spokenText);

  // Send the text to the server for processing
  fetch("/process-concept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: spokenText }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Display the generated image or diagram
      const output = document.getElementById("output");
      output.src = data.imageUrl;
      output.alt = "Generated Visualization";
    })
    .catch((err) => console.error("Error:", err));
};

// Start recognition
document.getElementById("start-btn").addEventListener("click", () => {
  recognition.start();
});