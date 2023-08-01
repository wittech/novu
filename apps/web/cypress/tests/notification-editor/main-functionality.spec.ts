import { addAndEditChannel, clickWorkflow, dragAndDrop, editChannel, fillBasicNotificationDetails, goBack } from '.';

describe('Workflow Editor - Main Functionality', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should not reset data when switching channel types', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test not reset data when switching channel types');
    cy.waitForNetworkIdle(500);
    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);
    cy.get('.ace_text-input').first().type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
      force: true,
    });
    goBack();
    cy.waitForNetworkIdle(500);

    dragAndDrop('email');
    cy.waitForNetworkIdle(500);
    editChannel('email');
    cy.waitForNetworkIdle(500);
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');
    cy.waitForNetworkIdle(500);
    goBack();

    editChannel('inApp');
    cy.waitForNetworkIdle(500);
    cy.get('.ace_text-layer').first().contains('{{firstName}} someone assigned you to {{taskName}}');
    goBack();
    cy.waitForNetworkIdle(500);
    editChannel('email');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('editable-text-content').contains('This text is written from a test');
    cy.getByTestId('emailSubject').should('have.value', 'this is email subject');
    cy.getByTestId('emailPreheader').should('have.value', 'this is email preheader');
  });

  it('should save avatar enabled and content for in app', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test save avatar');
    cy.waitForNetworkIdle(500);
    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);
    cy.get('.ace_text-input').first().type('new content for notification', {
      force: true,
    });
    cy.getByTestId('enable-add-avatar').click();
    cy.getByTestId('choose-avatar-btn').click();
    cy.getByTestId('avatar-icon-info').click();

    cy.getByTestId('notification-template-submit-btn').click();

    cy.getByTestId('enabled-avatar').should('be.checked');
    cy.getByTestId('avatar-icon-info').should('be.visible');
  });

  it('should edit in-app notification', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('title').first().should('have.value', template.name);

    editChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.get('.ace_text-layer').first().contains('Test content for <b>{{firstName}}</b>');

    goBack();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('title').clear().type('This is the new notification title');

    editChannel('inApp', true);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('use-feeds-checkbox').click();
    cy.getByTestId('feed-button-1').click({ force: true });

    cy.get('.ace_text-input')
      .first()
      .clear({
        force: true,
      })
      .type('new content for notification', {
        force: true,
      });
    goBack();
    cy.getByTestId('notification-template-submit-btn').click();

    cy.visit('/workflows');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('template-edit-link');
    cy.getByTestId('notifications-template').get('tbody tr td').contains('This is the new', {
      matchCase: false,
    });
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/edit/' + template._id);
    });

    cy.waitForNetworkIdle(500);

    editChannel('inApp', true);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('feed-button-1-checked');
    cy.getByTestId('create-feed-input').type('test4');
    cy.getByTestId('add-feed-button').click();
    cy.getByTestId('feed-button-2-checked');
  });

  it('should unset feedId for in app step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    editChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('use-feeds-checkbox').should('be.checked');
    cy.getByTestId('use-feeds-checkbox').click();
    cy.getByTestId('notification-template-submit-btn').click();
    cy.visit('/workflows');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('notifications-template').get('tbody tr td').contains(template.name, {
      matchCase: false,
    });
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/edit/' + template._id);
    });

    cy.waitForNetworkIdle(500);
    editChannel('inApp');
    cy.getByTestId('use-feeds-checkbox').should('be.checked');
  });

  it('should edit email notification', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    editChannel('email');

    // edit email editor content
    cy.getByTestId('email-editor').getByTestId('editor-row').first().click().type('{selectall}{backspace}Hello world!');
  });

  it('should update notification active status', function () {
    const template = this.session.templates[0];
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('active-toggle-switch').get('label').contains('Active');
    cy.getByTestId('active-toggle-switch').click({ force: true });
    cy.getByTestId('active-toggle-switch').get('label').contains('Inactive');

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('active-toggle-switch').get('label').contains('Inactive');
  });

  it('should toggle active states of channels', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test toggle active states of channels');

    goBack();
    // Enable email from button click
    dragAndDrop('email');
    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-emailSelector`);

    cy.getByTestId(`step-active-switch`).should('have.value', 'on');
    cy.getByTestId(`step-active-switch`).click({ force: true });

    // enable email selector
    cy.getByTestId(`step-active-switch`).click({ force: true });
    goBack();

    dragAndDrop('inApp');

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).should('have.value', 'on');
  });

  it('should show trigger snippet block when editing', function () {
    const template = this.session.templates[0];
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('get-snippet-btn').click();
    cy.getByTestId('trigger-code-snippet').contains('test-event');
  });

  it('should show error on node if message field is missing ', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails();
    goBack();
    dragAndDrop('email');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('be.visible');
    editChannel('email');
    cy.waitForNetworkIdle(500);
    cy.getByTestId('emailSubject').should('have.class', 'mantine-TextInput-invalid');

    cy.getByTestId('emailSubject').type('this is email subject');
    goBack();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('not.exist');
  });

  it('should allow uploading a logo from email editor', function () {
    cy.intercept('*/organizations', (r) => {
      r.continue((res) => {
        if (res.body) {
          delete res.body.data[0].branding.logo;
        }

        res.send({ body: res.body });
      });
    });
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test allow uploading a logo from email editor');

    addAndEditChannel('email');

    cy.getByTestId('upload-image-button').click();
    cy.get('.mantine-Modal-modal button').contains('Yes').click();

    cy.location('pathname').should('equal', '/brand');
  });

  it('should show the brand logo on main page', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test show the brand logo on main page');
    addAndEditChannel('email');

    cy.getByTestId('email-editor')
      .getByTestId('brand-logo')
      .should('have.attr', 'src', 'https://web.novu.co/static/images/logo-light.png');
  });

  it('should support RTL text content', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test support RTL text content');
    goBack();
    cy.waitForNetworkIdle(500);
    dragAndDrop('email');
    editChannel('email');

    cy.getByTestId('settings-row-btn').eq(0).invoke('show').click();
    cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'left');
    cy.getByTestId('align-right-btn').click();
    cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'right');
  });

  it('should create an SMS channel message', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test SMS Notification Title');
    cy.waitForNetworkIdle(500);

    addAndEditChannel('sms');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('smsNotificationContent').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    goBack();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('notification-template-submit-btn').click();

    cy.getByTestId('get-snippet-btn').click();
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').getByTestId('trigger-code-snippet').contains('test-sms-notification-title');
    cy.getByTestId('step-page-wrapper')
      .getByTestId('trigger-code-snippet')
      .contains("import { Novu } from '@novu/node'");

    cy.getByTestId('step-page-wrapper').getByTestId('trigger-code-snippet').contains('taskName');

    cy.getByTestId('step-page-wrapper').getByTestId('trigger-code-snippet').contains('firstName');
  });

  it('should save HTML template email', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Custom Code HTML Notification Title');
    addAndEditChannel('email');

    cy.getByTestId('emailSubject').type('this is email subject');

    cy.getByTestId('editor-type-selector')
      .find('.mantine-Tabs-tabsList')
      .contains('Custom Code', { matchCase: false })
      .click();
    cy.get('#codeEditor').type('Hello world code {{name}} <div>Test', { parseSpecialCharSequences: false });

    goBack();

    editChannel('email');
    cy.get('#codeEditor').contains('Hello world code {{name}} <div>Test</div>');
  });

  it('should redirect to dev env for edit template', function () {
    cy.intercept('POST', '*/notification-templates?__source=editor').as('createTemplate');
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    fillBasicNotificationDetails();

    cy.wait('@createTemplate').then((res) => {
      cy.intercept('GET', '/v1/changes?promoted=false').as('unpromoted-changes');
      cy.visit('/changes');

      cy.waitLoadTemplatePage(() => {
        cy.getByTestId('promote-btn').eq(0).click({ force: true });
        cy.getByTestId('environment-switch').find(`input[value="Production"]`).click({ force: true });
        cy.getByTestId('notifications-template').find('tbody tr').first().click();

        cy.location('pathname').should('not.equal', `/workflows`);

        cy.getByTestId('environment-switch').find(`input[value="Development"]`).click({ force: true });

        cy.location('pathname').should('equal', `/workflows`);
      });
    });
  });

  it('New template button should be disabled in the Production', function () {
    cy.visit('/workflows');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('environment-switch').find(`input[value="Production"] ~ label`).click();

    cy.getByTestId('create-workflow-btn').should('be.disabled');
  });

  it('Should not allow to go to New Template page in Production', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive');
    cy.getByTestId('environment-switch').find(`input[value="Production"] ~ label`).click();

    cy.location('pathname').should('equal', `/workflows`);
  });

  it('should save Cta buttons state in inApp channel', function () {
    cy.visit('/workflows/create');
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('In App CTA Button');
    cy.waitForNetworkIdle(500);
    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.get('.ace_text-input').first().type('Text content', {
      force: true,
    });

    cy.getByTestId('control-add').first().click();
    cy.getByTestId('template-container-click-area').eq(0).click();

    goBack();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('notification-template-submit-btn').click();

    cy.visit('/workflows');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('notifications-template')
      .get('tbody tr td')
      .contains('In App CTA Button', {
        matchCase: false,
      })
      .click();

    cy.waitForNetworkIdle(500);

    editChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('template-container').first().find('input').should('have.length', 1);

    cy.getByTestId('remove-button-icon').click();

    goBack();
    cy.waitForNetworkIdle(500);

    editChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('control-add').first();
  });

  it('should load successfully the recently created notification template, when going back from editor -> templates list -> editor', function () {
    cy.intercept('GET', '*/notification-templates**').as('getNotificationTemplates');
    cy.intercept('GET', '*/notification-templates/*').as('getNotificationTemplate');
    cy.visit('/workflows');
    cy.wait('@getNotificationTemplates');

    cy.getByTestId('create-workflow-btn').click();
    cy.getByTestId('create-workflow-blank').click();
    cy.wait('@getNotificationTemplate');

    fillBasicNotificationDetails('Test notification');

    addAndEditChannel('inApp');
    cy.get('.ace_text-input').first().type('Test in-app', {
      force: true,
    });

    addAndEditChannel('email');
    cy.getByTestId('editable-text-content').clear().type('Test email');
    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');
    goBack();

    cy.getByTestId('notification-template-submit-btn').click();

    cy.getByTestId('side-nav-templates-link').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('template-edit-link');
    cy.getByTestId('notifications-template')
      .get('tbody tr td')
      .contains('Test notification', {
        matchCase: false,
      })
      .click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId(`node-inAppSelector`).should('exist');
    cy.getByTestId(`node-emailSelector`).should('exist');
  });

  it('should load successfully the same notification template, when going back from templates list -> editor -> templates list -> editor', function () {
    cy.intercept('GET', '*/notification-templates**').as('getNotificationTemplates');
    cy.intercept('GET', '*/notification-templates/*').as('getNotificationTemplate');
    cy.visit('/workflows');
    cy.wait('@getNotificationTemplates');

    const template = this.session.templates[0];
    cy.getByTestId('notifications-template')
      .get('tbody tr td')
      .contains(template.name, {
        matchCase: false,
      })
      .click();
    cy.wait('@getNotificationTemplate');
    cy.getByTestId(`node-inAppSelector`).should('exist');
    cy.getByTestId(`node-emailSelector`).should('exist');

    cy.getByTestId('side-nav-templates-link').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('notifications-template')
      .get('tbody tr td')
      .contains(template.name, {
        matchCase: false,
      })
      .click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId(`node-inAppSelector`).should('exist');
    cy.getByTestId(`node-emailSelector`).should('exist');
  });
});
