// Form ownership and selectors live here so page templates can be extracted safely later.
const FORM_DEFINITIONS = Object.freeze({
  login: { page: "login", selector: "#login-form", submit: "login" },
  employee: { page: "user-management", selector: "#user-form", submit: "createEmployee" },
  breakAllowance: { page: "user-management", selector: "#break-allowance-form", submit: "updateEmployeeBreakAllowance" },
  timeOff: { page: "timeoff", selector: "#leave-form", submit: "saveLeave" },
  schedule: { page: "work-schedules", selector: "#schedule-form", submit: "saveSchedule" },
  task: { page: "tasks", selector: "#task-form", submit: "saveTask" },
  project: { page: "tasks", selector: "#project-form", submit: "saveProject" },
  taskComment: { page: "tasks", selector: "#task-comment-form", submit: "saveTaskComment" },
  attachment: { page: "tasks", selector: "#attachment-form", submit: "saveAttachment" },
  breakReason: { page: "dashboard", selector: "#break-reason-form", submit: "startBreak" },
});

function getFormDefinition(name) {
  return FORM_DEFINITIONS[name] || null;
}
