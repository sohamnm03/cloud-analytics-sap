*&---------------------------------------------------------------------*
*& SAP Analytics Layer — ABAP Integration Snippet
*& Use this in your BSP page, Fiori extension, or Web Dynpro to
*& dynamically render the bootstrapper HTML with real SAP context.
*&---------------------------------------------------------------------*

*& Option A: Inline HTML in a BSP page (simplest for PoC)
*& In your BSP page (.htm), replace the static placeholders:

* METHOD get_html_output.
*
*   DATA: lv_html TYPE string.
*
*   " Read base bootstrapper from SMW0 MIME object
*   " Object: Z_ANALYTICS_BOOT, type: text/html
*   CALL METHOD cl_mime_repository_api=>get_api(
*     RECEIVING
*       ro_api = DATA(lo_api)
*   ).
*
*   lo_api->get(
*     EXPORTING
*       i_url  = '/SAP/PUBLIC/Z_ANALYTICS_BOOT/bootstrapper.html'
*     IMPORTING
*       e_content = DATA(lv_content)
*   ).
*
*   lv_html = cl_abap_conv_in_ce=>uccp( lv_content ).
*
*   " ── Inject live SAP context ─────────────────────────────────
*   " Replace static placeholders with real session values
*   REPLACE ALL OCCURRENCES OF 'SAP_SID_PLACEHOLDER'
*     IN lv_html WITH sy-sysid.
*
*   REPLACE ALL OCCURRENCES OF 'SAP_CLIENT_PLACEHOLDER'
*     IN lv_html WITH sy-mandt.
*
*   REPLACE ALL OCCURRENCES OF 'SAP_USER_PLACEHOLDER'
*     IN lv_html WITH sy-uname.
*
*   " Return HTML
*   ev_html = lv_html.
*
* ENDMETHOD.


*& Option B: Direct URL call from ABAP report using CALL BROWSER
*& (Simpler PoC — just open the HTML directly)

REPORT z_analytics_borrowings.

DATA: lv_url TYPE string.

" Build URL to your SMW0-stored bootstrapper
lv_url = 'http://<sap-host>:<port>/sap/public/z_analytics/bootstrapper.html'.

" Open in SAP GUI browser
CALL FUNCTION 'CALL_BROWSER'
  EXPORTING
    url                    = lv_url
    new_window             = abap_true
  EXCEPTIONS
    frontend_not_supported = 1
    frontend_error         = 2
    prog_not_found         = 3
    no_batch               = 4
    unspecified_error      = 5
    OTHERS                 = 6.

IF sy-subrc <> 0.
  MESSAGE 'Could not launch analytics browser' TYPE 'E'.
ENDIF.


*& Option C: Fiori Launchpad — Custom UI5 tile
*& Create a Custom HTML tile in the FLP that points to the bootstrapper URL.
*& In your manifest.json:
*
*   "sap.ui": {
*     "technology": "URL",
*     "uri": "/sap/public/z_analytics/bootstrapper.html"
*   }
*
*& Then in your bootstrapper.html, read the SAPSID from the FLP context:
*&   var SAP_SID = (sap && sap.ui && sap.ui.getCore().getConfiguration().getSAPLogonLanguage())
*&     ? "<injected by server>" : "DEV";


*& ── Shared Secret Management ────────────────────────────────────
*& Store the HMAC shared secret in SAP Secure Store, not hardcoded:
*&
*& Read in ABAP:
*   CALL METHOD cl_sec_sxml_writer=>get_credential
*     EXPORTING
*       auth_class = 'ANALYTICS_LAYER'
*       auth_name  = 'HMAC_SECRET'
*     IMPORTING
*       secret     = DATA(lv_secret).
*
*& Then pass lv_secret to the HTML template when rendering.
*& This way, the secret is never visible in SMW0 source.
