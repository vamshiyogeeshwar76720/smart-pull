function goToSubscription() {
  window.location.href = "/frontend/home.html";
}
function goHome() {
  window.location.href = "/index.html";
}

function goBack() {
  window.location.href = "/frontend/home.html";
}

function closeProfileMenu() {
  document.getElementById("profileDropdown").style.display = "none";
}

// Profile menu
function toggleProfileMenu() {
  const menu = document.getElementById("profileDropdown");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function goToPersonalInfo() {
  window.location.href = "personalinfo.html";
}

function showModifyForm() {
  const modifyForm = document.getElementById("modifyForm");
  if (modifyForm) modifyForm.classList.remove("hidden");
}
