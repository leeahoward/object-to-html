var expand = elName => {
  document.getElementById(`${elName}-content`).style.display = "block";
  document.getElementById(`${elName}-arrow-down`).style.display = "block";
  document.getElementById(`${elName}-arrow-right`).style.display = "none";
};

var collapse = elName => {
  document.getElementById(`${elName}-content`).style.display = "none";
  document.getElementById(`${elName}-arrow-down`).style.display = "none";
  document.getElementById(`${elName}-arrow-right`).style.display = "block";
};
