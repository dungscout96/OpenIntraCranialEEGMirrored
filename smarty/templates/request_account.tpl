<script src='https://www.google.com/recaptcha/api.js'></script>
<div class="panel panel-default panel-center">
  <div class="panel-heading">
    <h3 class="panel-title">
      {if $success}
        Account requested!
      {else}
        {$page_title}
      {/if}
    </h3>
  </div>
  <div class="panel-body">
  {if $success}
    <div class="success-message">
      <h1>Thank you!</h1>
      <p>Your request for access to the MNI Open iEEG Atlas has been received.</p>
      <p>You will receive a login credential by email once your account has been approved.</p>
      <a href="/" class="btn btn-primary btn-block">
        Return to Login Page
      </a>
    </div>
  {else}
    <p class="text-center">
      Please complete an account request for research purposes only. 
      <br>No commercial use without written permission from the authors.
      <br>You will be notified by email once your account has been approved.
    </p>
    <form action="/request-account/" method="POST"
          name="form1" id="form1">
      <div class="form-group">
        <input type="text" name="name" class="form-control" id="name" size="20"
               placeholder="First Name" value="{$form.name}" />
        <span id="helpBlock" class="help-block">
          <b class="text-danger">{$error_message['name']}</b>
        </span>
      </div>
      <div class="form-group">
        <input type="text" name="lastname" class="form-control" id="lastname"
               placeholder="Last Name" value="{$form.lastname}" />
        <span id="helpBlock" class="help-block">
          <b class="text-danger">{$error_message['lastname']}</b>
        </span>
      </div>

      <div class="form-group">
        <input type="text" name="institution" class="form-control" id="institution"
               placeholder="Institution or Affiliation" value="{$form.institution}" />
        <span id="helpBlock" class="help-block">
          <b class="text-danger">{$error_message['institution']}</b>
        </span>
      </div>

      <div class="form-group">
        <input type="text" name="from" class="form-control" id="from"
               placeholder="Email" value="{$form.from}" />
        <span id="helpBlock" class="help-block">
          <b class="text-danger">{$error_message['from']}</b>
        </span>
      </div>

<!--  ### Open iEEG : does not need Site, Examiner, Radiologist specified

      <div class="form-group">
        <select class="form-control" name="site" id="site">
          <option value="">Choose Site</option>
          {foreach from=$site_list item=site key=idx}
            <option value="{$idx}" {if $idx == $form.site}selected{/if}>
              {$site}
            </option>
          {/foreach}
        </select>
        <span id="helpBlock" class="help-block">
          <b class="text-danger">{$error_message['site']}</b>
        </span>
      </div>
      <div class="form-group">
        <label class="checkbox-inline">
          <input
            type="checkbox"
            name="examiner"
            id="examiner"
            {if $form.examiner === "on"}checked{/if}
          /> Examiner Role
        </label>
        <label class="checkbox-inline">
          <input
            type="checkbox"
            name="radiologist"
            id="radiologist"
            {if $form.radiologist === "on"}checked{/if}
          /> Radiologist
        </label>
      </div>
-->
      {if $captcha_key}
        {* Google reCaptcha *}
        <div class="form-group">
          <div class="g-recaptcha" data-sitekey="{$captcha_key}"></div>
          <span id="helpBlock" class="help-block">
              <b class="text-danger">{$error_message['captcha']}</b>
            </span>
        </div>
      {/if}
      <div class="form-group">
        <input type="submit" name="Submit" class="btn btn-primary btn-block"
               value="Request Account"/>
      </div>
      <div class="form-group">
        <a href="/">Back to login page</a>
      </div>
    {/if}
  </div>
</div>
