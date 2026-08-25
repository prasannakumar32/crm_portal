function renderBreakReasonForm() {
  return `
    <div class="task-modal-overlay" id="break-reason-modal" style="display:none;">
      <div class="task-modal-card break-reason-card">
        <div class="task-modal-header">
          <h3>Why are you taking a break?</h3>
          <button class="icon-button" id="close-break-reason-modal" type="button" aria-label="Close break reason dialog">&times;</button>
        </div>
        <form id="break-reason-form">
          <div class="break-reason-options">
            <label class="break-reason-option"><input type="radio" name="breakReason" value="Breakfast" checked><span>Breakfast</span></label>
            <label class="break-reason-option"><input type="radio" name="breakReason" value="Lunch"><span>Lunch</span></label>
            <label class="break-reason-option"><input type="radio" name="breakReason" value="Other"><span>Other</span></label>
          </div>
          <label class="field-block break-reason-custom" id="break-reason-custom-wrap" style="display:none;"><span>Other reason</span><input id="break-reason-other" type="text" maxlength="200" placeholder="Please specify your reason" /></label>
          <div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-break-reason">Cancel</button><button class="btn btn-primary" type="submit">Start break</button></div>
        </form>
      </div>
    </div>
    <div class="task-modal-overlay" id="attendance-time-modal" style="display:none;">
      <div class="task-modal-card">
        <div class="task-modal-header">
          <h3 id="attendance-time-title">Attendance action time</h3>
          <button class="icon-button" id="close-attendance-time-modal" type="button" aria-label="Close time dialog">&times;</button>
        </div>
        <form id="attendance-time-form">
          <label class="field-block"><span>Enter time</span><input id="attendance-time" type="datetime-local" required /></label>
          <div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-attendance-time">Cancel</button><button class="btn btn-primary" type="submit">Save time</button></div>
        </form>
      </div>
    </div>`;
}

function createBreakReasonModalHtml() {
  return renderBreakReasonForm();
}
