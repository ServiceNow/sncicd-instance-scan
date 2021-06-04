# ServiceNow CI/CD GitHub Action for Instance Scan

Execute Instance Scans and get progress and results of runs. 

# Use Case
1. Scoped Applications

    - If you have a scoped application linked to source control, you can configure Github Actions to trigger when a commit is added from ServiceNow. You would either set it up to just trigger on the scoped application using `appScopeSysIds`or after you have manually run a set of suites on the scoped application, you can utilize the `comboSysId`
    
2. Triggered remotely through Github APIs

    - Another way to utilize this when you don't have code linked to source control, would be to create business rules and REST messages (or flows and rest steps) to trigger the scans. The example that comes to mind is if you want to trigger this without writing code on the target instance. If that is the case, you are going to run into issues around IP listing and having the checks / suite sys_ids known. Although it is possible, it seems overkill for this use case because you could just trigger this through internal ServiceNow APIs

# Usage
## Step 1: Prepare values for setting up your variables for Actions
- credentials (username and password for a service account)
- instance URLs for your dev, test, prod, etc. environments

## Step 2: Configure Secrets in your GitHub repository
On GitHub, go in your repository settings, click on the secret _Secrets_ and create a new secret.

Create secrets called 
- `NOW_USERNAME`
- `NOW_PASSWORD`
- `NOW_SCAN_INSTANCE` only the **domain** string is required from the instance URL, for example https://**domain**.service-now.com

## Step 3: Example Workflow Template
https://github.com/ServiceNow/sncicd_githubworkflow

## Step 4: Configure the GitHub Action if need to adapt for your needs or workflows
```yaml
- name: ServiceNow CI/CD Instance Scan
    uses: ./.github/actions/scan
    id: scan
    with:
        scantype: full # point, suite_combo, suite_scoped, suite_update
        targetTable: <target_table>
        targetSysId: <target_sys_id>
        comboSysId: <combo_sys_id>
        suiteSysId: <suite_sys_id>
        appScopeSysIds: <app_scope_sys_ids_comma_separated>
        updateSetSysIds: <update_set_sys_ids_comma_separated>
    env:
        nowUsername: ${{ secrets.NOW_USERNAME }}
        nowPassword: ${{ secrets.NOW_PASSWORD }}
        nowScanInstance: ${{ secrets.NOW_SCAN_INSTANCE }}
```

  targetTable:
    description: "URL param if point scan type is specified."
    required: false
  targetSysId:
    description: "URL param if point scan type is specified."
    required: false
  comboSysId:
    description: ""
    required: false
  suiteSysId:
    description: "URL param if suite_scoped or suite_update scan type is specified."
    required: false
  appScopeSysIds:
    description: "Payload params, comma separated(if suite_scoped or suite_update scan type is specified)."
    required: false
  updateSetSysIds:
    description: "Payload params, comma separated(if suite_scoped or suite_update scan type is specified)."
    required: false

- **scantype** - Type of scan process. Can be equal to full, point, suite_combo, suite_scoped, suite_update(Required).
- **targetTable** - URL param, required if point scan type is specified.
- **targetSysId** - URL param, required if point scan type is specified.
- **comboSysId** - URL param, required if suite_combo scan type is specified..
- **suiteSysId** - URL param, required if suite_scoped or suite_update scan type is specified.
- **appScopeSysIds** - Payload params, comma separated(required if suite_scoped or suite_update scan type is specified).
- **updateSetSysIds** - Payload params, comma separated(required if suite_scoped or suite_update scan type is specified).

Environment variable should be set up in the Step 1
- nowUsername - Username to ServiceNow instance
- nowPassword - Password to ServiceNow instance
- nowScanInstance ServiceNow instance where application is developing

# Contributing

## Tests

Tests should be ran via npm commands:

#### Unit tests
```shell script
npm run test
```   

#### Integration test
```shell script
npm run integration
```   

## Build

```shell script
npm run buid
```

## Formatting and Linting
```shell script
npm run format
npm run lint
```

# Notices

## Support Model

ServiceNow built this integration with the intent to help customers get started faster in adopting CI/CD APIs for DevOps workflows, but __will not be providing formal support__. This integration is therefore considered "use at your own risk", and will rely on the open-source community to help drive fixes and feature enhancements via Issues. Occasionally, ServiceNow may choose to contribute to the open-source project to help address the highest priority Issues, and will do our best to keep the integrations updated with the latest API changes shipped with family releases. This is a good opportunity for our customers and community developers to step up and help drive iteration and improvement on these open-source integrations for everyone's benefit. 

## Governance Model

Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers. 
