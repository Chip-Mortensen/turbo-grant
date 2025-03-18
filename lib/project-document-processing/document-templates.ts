/**
 * Document content templates for different grant types
 * These templates provide information about required documents for different grant types
 * Used by the application requirements system to identify document requirements
 */

import { getDocumentText } from './query';

/**
 * Document templates organized by grant type
 */
export const documentTemplates: Record<string, string> = {
  // Research Grants (R series)
  research: `I. SF424 (R&R) Form Documents:

        SF424 (R&R) Form itself:

        Condition: Always required for all grant applications.

        Cover Letter Attachment:

        Condition:

        For internal use only.

        For late applications (explaining the delay).

        For changed/corrected applications submitted after the due date (explaining the reason for late submission).

        Explanation of any subaward budget components that are not active for all budget periods.

        Statement that you have attached any required agency approval documentation for the type of application submitted (e.g., approval for applications that request $500,000 or more, approval for Conference Grant or Cooperative Agreement (R13 or U13), etc.).

        When intending to submit a video as part of the application (cover letter must include information about the intent to submit it).

        If the proposed studies will generate large-scale human or non-human genomic data.

        If the proposed studies involve human fetal tissue obtained from elective abortions (HFT), regardless of whether or not Human Subjects are involved and/or there are costs associated with the HFT.

        Correction: Added condition: If you are submitting a changed/corrected application after the due date, a cover letter is required, and it must explain the reason for late submission of the changed/corrected applications.

        SFLLL (Disclosure of Lobbying Activities) or Other Explanatory Documentation:

        Condition: If applicable, attach the SFLLL or other explanatory document as per NOFO instructions. If unable to certify compliance with the Certification in the "17. Certification" section above, attach an explanation.

        II. PHS 398 Cover Page Supplement Form Documents:

        PHS 398 Cover Page Supplement Form itself:

        Condition: Required for all grant applications except fellowships.

        Justification for Euthanasia Method (if applicable):

        Condition: If you answer "No" to the question "Is method consistent with American Veterinary Medical Association (AVMA) guidelines?" in the Vertebrate Animals Section.

        HFT Compliance Assurance:

        Condition: If the proposed project involves the use of human fetal tissue obtained from elective abortions (HFT).

        HFT Sample IRB Consent Form:

        Condition: If the proposed project involves the use of human fetal tissue obtained from elective abortions (HFT).

        III. R&R Other Project Information Form Documents:

        R&R Other Project Information Form itself:

        Condition: Always required for all grant applications.

        Justification for Use of Human Specimens/Data (if applicable):

        Condition: If you answer "Yes" to "Does any of the proposed research in the application involve human specimens and/or data?" but you are claiming that the use of those specimens/data does not constitute human subjects research.

        Foreign Justification (if applicable):

        Condition: If you answer "Yes" to "Does this project involve activities outside of the United States or partnerships with international collaborators?"

        Project Summary/Abstract:

        Condition: Always required.

        Project Narrative:

        Condition: Always required.

        Bibliography & References Cited:

        Condition: Always required unless otherwise noted in the NOFO.

        Facilities & Other Resources:

        Condition: Always required unless otherwise specified in the NOFO.

        Equipment:

        Condition: Always required.

        Other Attachments:

        Condition: Used to provide additional information only in accordance with the NOFO and/or agency-specific instructions.

        IV. Project/Performance Site Location(s) Form Documents:

        Project/Performance Site Location(s) Form itself:

        Condition: Always required for all grant applications.

        Additional Performance Sites (if needed):

        Condition: If you need to add more project/performance site locations than the form allows.

        V. R&R Senior/Key Person Profile (Expanded) Form Documents:

        R&R Senior/Key Person Profile (Expanded) Form itself:

        Condition: Always required for all grant applications.

        Biographical Sketch (Biosketch) for each Senior/Key Person and Other Significant Contributors (OSCs):

        Condition: Required for all senior/key personnel and other significant contributors.

        Current & Pending Support (Other Support) (if required):

        Condition: Do not use this attachment upload for NIH and other PHS agency submissions unless otherwise specified in the NOFO.

        Additional Senior/Key Person Profiles (if needed):

        Condition: If you need to add more Senior/Key Person Profiles than the form allows.

        VI. R&R Budget Form Documents:

        R&R Budget Form itself:

        Condition: Required for the majority of applications, but refer to the specific NOFO.

        Justification for Euthanasia Method (if applicable):

        Condition: If you answer "No" to the question "Is method consistent with American Veterinary Medical Association (AVMA) guidelines?" in the Vertebrate Animals Section.

        Justification for Administrative, Secretarial, or Clerical Support Salaries (if applicable):

        Condition: If you are requesting to directly charge administrative, secretarial, or clerical salaries.

        List of Postdoctoral and Graduate Students (if applicable):

        Condition: If you have postdoctoral associates and graduate students not already named in "Section A. Senior/Key Person."

        Justification for Equipment (if applicable):

        Condition: For each item of equipment exceeding $5,000.

        Justification for Travel (if applicable):

        Condition: For both domestic and foreign travel costs.

        Justification for Materials and Supplies (if applicable):

        Condition: Indicate general categories such as glassware, chemicals, animal costs, etc., including an amount for each category.

        Justification for Consultant Services (if applicable):

        Condition: For all consultant services.

        Justification for ADP/Computer Services (if applicable):

        Condition: For ADP/computer services.

        Justification for Equipment or Facility Rental/User Fees (if applicable):

        Condition: For equipment or facility rental/user fees.

        Justification for Alterations and Renovations (if applicable):

        Condition: For alterations and renovations.

        Justification for Other Direct Costs (if applicable):

        Condition: For any "other" direct costs not requested above.

        Justification for Non-9-Month Academic Year or 3-Month Summer Period (if applicable):

        Condition: If your organization does not use a 9-month academic year or a 3-month summer period, indicate your organization's definition of these.

        VII. R&R Subaward Budget Attachment(s) Form Documents:

        R&R Subaward Budget Attachment(s) Form itself:

        Condition: Required if you have a subaward/consortium and are using the R&R Budget Form.

        R&R Budget Form and Budget Justification for each subaward/consortium:

        Condition: Each consortium recipient organization that performs a substantive portion of the project.

        VIII. PHS 398 Modular Budget Form Documents:

        PHS 398 Modular Budget Form itself:

        Condition: Refer to the specific NOFO. Generally, applicable only to research applications from domestic organizations requesting $250,000 or less per budget period in direct costs.

        Personnel Justification:

        Condition: All personnel, including names, percent effort (use the Person Months metric), and roles on the project.

        Consortium Justification:

        Condition: Provide an estimate of total consortium / subaward costs (direct costs plus indirect [F&A] costs) for each budget period, rounded to the nearest $1,000.

        Additional Narrative Justification:

        Condition: If the requested budget requires any additional justification (e.g., variations in the number of modules requested, applications submitting a DMS plan).

        IX. PHS 398 Research Plan Form Documents:

        PHS 398 Research Plan Form itself:

        Condition: Used only for research, multi-project, and SBIR/STTR applications.

        Introduction to Application (for Resubmission and Revision applications):

        Condition: Required only if the type of application is resubmission or revision or if the NOFO specifies that one is needed.

        Specific Aims:

        Condition: Always required unless otherwise specified in the NOFO.

        Research Strategy:

        Condition: Always required.

        Progress Report Publication List:

        Condition: Required only if the type of application is renewal.

        Vertebrate Animals:

        Condition: If you answered "Yes" to the question "Are Vertebrate Animals Used?" on the R&R Other Project Information Form.

        Select Agent Research:

        Condition: If your proposed activities involve the use of select agents at any time during the proposed project period.

        Multiple PD/PI Leadership Plan:

        Condition: Any applicant who designates multiple PD/Pls.

        Consortium/Contractual Arrangements:

        Condition: If you have consortiums/contracts in your budget.

        Letters of Support:

        Condition: Always required unless otherwise specified in the NOFO.

        Resource Sharing Plan(s):

        Condition: Always required unless otherwise specified in the NOFO.

        Other Plan(s):

        Condition: If a Data Management and Sharing Plan is required in the proposed application.

        Authentication of Key Biological and/or Chemical Resources:

        Condition: If applicable to the proposed science.

        Appendix:

        Condition: Refer to the NOFO to determine whether there are any special appendix instructions for your application.

        X. PHS Human Subjects and Clinical Trials Information Form Documents:

        PHS Human Subjects and Clinical Trials Information Form itself:

        Condition: All applicants must use this form regardless of your answer to the question "Are human subjects involved?" on the R&R Other Project Information Form.

        Explanation for Use of Human Specimens/Data (if applicable):

        Condition: If you answer "Yes" to the question "Does any of the proposed research in the application involve human specimens and/or data?" but you are claiming that the use of those specimens/data does not constitute human subjects research.

        Study Record(s):

        Condition: If you answered "Yes" to the question "Are Human Subjects Involved?" on the R&R Other Project Information Form.

        Delayed Onset Study(ies):

        Condition: If you anticipate conducting research involving human subjects but cannot describe the study at the time of application.

        Other Requested Information (if applicable):

        Condition: If permitted by your NOFO.

        XI. PHS Assignment Request Form Documents:

        PHS Assignment Request Form itself:

        Condition: Optional. Use only if you wish to communicate specific awarding component assignments or review preferences.`,

  // Career Development Awards (K series)
  career: `I. SF 424 (R&R) Form (Application for Federal Assistance)

        Always Required: This is the core application form, providing basic information about the applicant organization, PD/PI, and project.

        II. PHS 398 Cover Page Supplement Form

        Generally Required (but not for Fellowships): Used to collect information about human subjects, vertebrate animals, program income, human embryonic stem cells, inventions and patents, and change of investigator/organization.

        Condition: Applying for a non-fellowship K-series grant application (e.g., K01, K08, K23, K25). Fellowship applications (F-series) do not use this form.

        Vertebrate Animals Section: (if answered 'Yes" on K.220)

        Condition: The project uses vertebrate animals in research.

        Sub-Conditions:

        Euthanasia Question: If "Yes" to vertebrate animal use, you must indicate whether the animals will be euthanized.

        AVMA Guidelines Question: If "Yes" to euthanasia, you must indicate whether the method is consistent with American Veterinary Medical Association (AVMA) guidelines.

        Justification for Non-AVMA Method: If "No" to AVMA guidelines, a detailed description and scientific justification for the alternative method are required.

        Program Income Section

        Condition: The application anticipates earning program income during the budget period.

        Sub-Conditions:

        Budget Period: List all budget periods for which program income is anticipated.

        Anticipated Amount ($): Specify the amount of anticipated program income for each budget period.

        Source(s): Specify the source(s) of anticipated program income for each budget period.

        Human Embryonic Stem Cell Section

        Condition: The project involves the use of human embryonic stem cells (hESC).

        Sub-Conditions:

        Specific Cell Line Selection: If hESC use is planned, indicate whether a specific cell line from the NIH HESC Registry will be used. If not, check the box indicating that one from the registry will be used.

        Human Fetal Tissue Section

        Condition: The project involves human fetal tissue obtained from elective abortions (HFT).

        Sub-Conditions:

        HFT Compliance Assurance: If HFT is used, a letter assuring compliance with informed consent and valuable consideration requirements is needed.

        HFT Sample IRB Consent Form: If HFT is used, a blank sample of the IRB-approved consent form is needed.

        Inventions and Patents Section (for Renewal/Resubmission of Renewals)

        Condition: Submitting a renewal application (or resubmission of a renewal) and inventions were conceived or reduced to practice during the prior funding period.

        Sub-Conditions:

        Previously Reported: If "Yes" to inventions, indicate whether the information has been previously reported.

        Change of Investigator/Change of Organization Section

        Condition: If there has been a change in the Project Director/Principal Investigator (PD/PI) or a change of recipient organization from a previous application and submitting a revision application.

        Sub-Conditions:

        Change of Project Director/Principal Investigator: If there is a change in the PD/PI, provide information about the former PD/PI.

        Change of Recipient Organization: If there is a change in the recipient organization, provide the name of the former organization.

        III. R&R Other Project Information Form

        Always Required: Collects information about human subjects, vertebrate animals, environmental impact, and attachments like the abstract, narrative, and references.

        Are Human Subjects Involved?

        Condition: If activities involving human subjects are planned at any time during the proposed project at any performance site

        Is the Project Exempt from Federal regulations?

        Condition: If activities involving human subjects are planned at any time during the proposed project at any performance site, and the project is exempt from federal regulations

        IRB Review Pending?

        Condition: If activities involving human subjects are planned at any time during the proposed project at any performance site, and the project is not exempt from federal regulations, and IRB review is pending

        IRB Approval Date

        Condition: If activities involving human subjects are planned at any time during the proposed project at any performance site, and the project is not exempt from federal regulations, and the IRB review is complete

        Human Subject Assurance Number

        Condition: If activities involving human subjects are planned at any time during the proposed project at any performance site, and the project is not exempt from federal regulations, and the applicant has an approved Federalwide Assurance (FWA) number

        Proprietary/Privileged Information:

        Condition: If the application includes patentable ideas or other protected information

        Environmental Impact Statement

        Condition: If there is any actual or potential positive or negative environmental impact, and no exemption is authorized or EA/EIS statement has been performed

        Explanation for Environmental Impact

        Condition: If there is any actual or potential positive or negative environmental impact, a description of all details about the nature of it is needed

        Historical Place Designation

        Condition: If the project performance site is historically designated or eligible

        Explanation for Historical Place

        Condition: If the project performance site is historically designated or eligible, a description of all details about the nature of it is needed

        Activities Outside the United States

        Condition: If there are any activities or partnerships with international collaborators involved

        Countries List for Activities Outside the United States

        Condition: If there are activities or partnerships with international collaborators involved, a list of all involved countries is needed

        Optional Explanation for Activities Outside the United States

        Condition: If there are activities or partnerships with international collaborators involved, an explanation of all involvement is needed

        Foreign Justification (added as "Other Attachment")

        Condition: If the project involves activities outside of the United States or partnerships with international collaborators, you must explain characteristics, resources, reason why facilities are appropriate than a domestic setting

        Project Summary/Abstract (Attachment)

        Always Required: Succinct description of the proposed work, career development plan, and candidate's career goals (30-line limit).

        Project Narrative (Attachment)

        Always Required: Brief statement of the research's relevance to public health (max 3 sentences).

        Bibliography & References Cited (Attachment)

        Always Required: List of references cited in the application, as well as a K.410 and K.500

        Facilities & Other Resources (Attachment)

        Always Required: Description of the scientific environment, resources available to the candidate (or team), and collaborative arrangements. A detailed description of facilities and resources is available to the candidate.

        Equipment (Attachment)

        Always Required: List of major equipment already available for the project.

        Other Attachments (Attachment)

        Condition: ONLY when required by the NOFO or agency-specific instructions. Should not be used for proprietary or PII.

        IV. Project/Performance Site Location(s) Form

        Always Required: Identifies all performance locations for the project.

        V. R&R Senior/Key Person Profile (Expanded) Form

        Always Required: Details about the PD/PI (candidate) and all other significant contributors.

        Biographical Sketch (Attachment)

        Always Required for PD/PI and all other significant contributors: Describes their qualifications, experience, and contributions to science. Use five-page form

        Current & Pending Support (Attachment)

        Required for Mentor/Co-Mentor: All sources of funding. Limited to 3 pages

        VI. R&R Budget Form

        Required (Unless modular budget instructions are provided): Detailed budget for each year of the project, including personnel costs, equipment, travel, and other expenses.

        Justification (Attachment)

        Always Required: Provides detailed justification for each budget category, explaining the need for the requested funds.

        VII. R&R Subaward Budget Attachment(s) Form

        Condition: If the project includes one or more subawards or consortium agreements that involve a substantive portion of work (ie, not just the purchase of goods/services). Each subaward site submits its own separate R&R Budget Form.

        VIII. PHS 398 Career Development Award Supplemental Form (K.410)

        Required for K-series Applications: Collects specific information for career development awards, including the career development plan, mentor information, and research plan.

        Introduction to Application: For resubmission or revision

        Condition: For resubmission or revision

        Candidate Information and Goals for Career Development

        Always Required, as needed; A. Summary, and B. Training/Career Activities

        Vertebrate Animals

        Condition: If animals are used; A. Describe animals; B. Justify them; and C. Minimize Pain/Distress

        Select Agent Research

        Condition: If any component includes the use of the highly regulated listed items

        Consortium/Contractual Arrangements

        Condition: If there are consortiums or sub-awards; A. Indicate administrative, organizational, and financial arrangements

        Resource Sharing

        Condition: If there are resource allocations to be described; See "Is Resource Sharing addressed in the Application? above

        Other Plan (s)

        Condition: Data management or sharing (or both) is being addressed, depending

        Data Management and Sharing Plan: (attach)

        Condition: Describes what the data management plan will entail

        Authentication of Key Biological and/or Chemical Resources:

        Condition: if there's any biological or chemical resources that need this authentication.

        Appendix:

        Condition: If there are any items that need appendix information

        Inclusion of Individuals Across the Lifespan:
        Condition: This is a requirement when applicable

        Plans and Statements of Mentor/Co-Mentor:

        Condition: for career development award applications
        * Description of the Institutional Environment
        Condition: Always Needed

        Institutional Commitment to Candidate's Research Career Development
        Condition: Always needed

        Description of Candidate's Contribution to Program Goals

        Condition: for applications that have a diversity-related element.

        IX. PHS Human Subjects and Clinical Trials Information Form (K.500)

        Always Required: Used to collect detailed information about human subjects research and clinical trials. Note: the level of detail required depends on the nature of the study (exempt vs. non-exempt, clinical trial vs. not).

        Protection of Human Subjects attachment, with the following elements:

        Risks to human subjects

        Protections against risk

        Potential benefits to research participants and others

        Importance of knowledge to be gained

        Multiple Study records - one each for: A-G below

        A. Use of Human Specimen/Data

        Required when using Human Specimen/Data, or when data is collected.

        Justification of data usage, or justification why it's not needed

        B. Exemption Numbers

        Condition: If the proposed study is exempt

        C. Is this Multi-site?

        Condition: is there a multi-site?

        D. Data and Safety Monitoring

        Data and Safety Monitoring Board

        If a data and safety monitoring plan will be used

        C. Is Data and Safety Monitoring Boards to be used?

        If No, reason why, if necessary

        X. PHS Assignment Request Form (K.600)

        Optional: This is ONLY used if the applicant has specific requests regarding which NIH Institute/Center or study section should review the application.

        XI Other (Program-Specific) Documents

        Condition: Check the NOFO very carefully. Some funding opportunities require very specific, additional documents (e.g., letters of support beyond the mentor, detailed career plans, etc.). These will be outlined in the NOFO's instructions.

        XII. Letters of Reference

        Condition: Required for specific K-series awards. Check the NOFO to determine if letters of reference are required for your specific K award.

        XIII. Data Management and Sharing Plan (DMSP)

        Condition: Required for all awards that will generate scientific data. See the NIH's Data Management and Sharing Policy for details.

        XIV. Human Fetal Tissue (HFT) Documentation

        Condition: If the research involves the use of human fetal tissue from elective abortions, specific documentation regarding compliance with NIH policies is required.

        XV. Just-in-Time (JIT) Information

        Condition: Requested by NIH after initial review but before award. May include:

        IRB approval date

        IACUC approval date

        Updated Other Support information

        Other information as specified by the NOFO or NIH program staff

        XVI. Post-Award Reporting

        Condition: Required after the award is made. Includes:

        Progress reports

        Financial reports

        Final invention statement`,

  // Fellowship Grants (F series)
  fellowship: `I. SF 424 (R&R) Form (Application for Federal Assistance)

        Required: For all fellowship applications. This is the core application form.

        Conditions for Specific Fields:

        Field 4.c (Previous Grants.gov Tracking ID): Required if submitting a Changed/Corrected Application.

        Field 21 (Cover Letter Attachment): Always required.

        Must contain a list of referees (including name, departmental affiliation, and institution).

        For late applications, include specific information about the timing and nature of the delay.

        For changed/corrected applications submitted after the due date, explain the reason for the late submission. If a cover letter was previously submitted, include all previous text in the revised letter.

        Explanation of any subaward budget components that are not active for all budget periods.

        Statement that you have attached any required agency approval documentation (e.g., for applications requesting $500,000 or more, Conference Grants, or Cooperative Agreements).

        Information about the intent to submit a video as part of the application.

        A statement if the proposed studies will generate large-scale human or non-human genomic data.

        A statement if the proposed studies involve human fetal tissue obtained from elective abortions (HFT).

        Field 14 (Project Director/Principal Investigator Contact Information): Must reflect the individual fellowship candidate.

        Field 15 (Estimated Project Funding): Must include the applicable stipend amount, the actual tuition and fees, and the standard institutional allowance.

        II. R&R Other Project Information Form

        Required: For all fellowship applications.

        Conditions for Specific Attachments:

        Project Summary/Abstract: Required.

        Should summarize the research project, fellowship training plan, and the environment. Limited to 30 lines of text.

        Project Narrative: Required.

        Limited to three sentences describing the relevance of the research to public health.

        Bibliography & References Cited: Required.

        Must include references cited in the PHS Fellowship Supplemental Form and PHS Human Subjects and Clinical Trials Information form.

        Facilities & Other Resources: Required.

        Should describe the organizational scientific and educational facilities and resources necessary and accessible to the fellowship candidate to complete the proposed research training plan.

        Equipment: Required.

        Other Attachments:

        Foreign Justification: Required if the project involves activities outside the United States or partnerships with international collaborators.

        Must include a description of how the foreign training is more appropriate than in a domestic setting.

        III. Project/Performance Site Location(s) Form

        Required: For all fellowship applications.

        One site must be the sponsoring organization.

        If there is more than one training site, including any Department of Veterans Affairs (VA) facilities or foreign sites, list them all in the fields provided for Location 1, and additional locations, as necessary.

        If there are unusual circumstances involved in the research training proposed, such as fieldwork or a degree sought from an institution other than the one in which the research training will take place, describe these circumstances in F.220 - R&R Other Project Information Form, Facilities and Resources.

        IV. R&R Senior/Key Person Profile (Expanded) Form

        Required: For all fellowship applications.

        Conditions for Specific Attachments:

        Biographical Sketch: Required for the fellowship candidate (PD/PI), the sponsor, and any co-sponsors.

        Current & Pending Support: Not required at the time of application submission, but may be requested later as Just-in-Time information.

        V. PHS Fellowship Supplemental Form

        Required: For all fellowship applications.

        Conditions for Specific Attachments:

        Introduction to Application: Required only for resubmission applications.

        Candidate's Goals, Preparedness, and Potential: Required.

        Training Activities and Timeline: Required.

        Research Training Project Specific Aims: Required.

        Research Training Project Strategy: Required.

        Progress Report Publication List: Required only for renewal applications.

        Training in the Responsible Conduct of Research: Required.

        Sponsor(s) Commitment Statement: Required. The sponsor and each co-sponsor must provide statements.

        Letters of Support from Collaborators, Contributors, and Consultants: Required if any collaborators, consultants, or advisors are expected to contribute to the scientific development or execution of the candidate's research training plan.

        Description of Candidate's Contribution to Program Goals: Required only for applicants to diversity-related NOFOs.

        Vertebrate Animals: Required if vertebrate animals are used in the project.

        Select Agent Research: Required if the proposed activities involve the use of select agents.

        Resource Sharing Plan: Not required for due dates on or after January 25, 2023.

        Authentication of Key Biological and/or Chemical Resources: Required if applicable to the proposed science.

        Appendix: Only if the NOFO specifies special appendix instructions.

        VI. PHS Human Subjects and Clinical Trials Information Form

        Required: For all fellowship applications, regardless of whether human subjects are involved.

        Conditions for Specific Attachments:

        Explanation for Use of Human Specimens/Data (Not Human Subjects Research): Required if human specimens and/or data are used, but the research is not considered human subjects research.

        Study Record(s): Required if the project involves human subjects research.

        Delayed Onset Study(ies): Required if human subjects are anticipated, but specific plans are not yet defined.

        Single IRB Plan Attachment: Not required for NIH applicants.

        Data and Safety Monitoring Plan: Optional for all human subjects research.

        Other Clinical Trial-related Attachments: Only if the NOFO specifically requests it.

        VII. PHS Assignment Request Form

        Optional: For communicating assignment and review preferences to NIH staff.`,

  training: `I. Required Documents for All Applications (Unless Otherwise Stated)

        SF 424 (R&R) Form: This is the core application form and is always required.

        Condition: Always required for any grant application.

        R&R Other Project Information Form: This form collects general project information.

        Condition: Always required, unless the NOFO specifically states otherwise.

        Project Summary/Abstract (Attachment to R&R Other Project Information Form): A concise summary of the proposed research.

        Condition: Always required as part of the R&R Other Project Information Form.

        Project Narrative (Attachment to R&R Other Project Information Form): A brief statement of the project's relevance to public health.

        Condition: Always required as part of the R&R Other Project Information Form.

        Bibliography & References Cited (Attachment to R&R Other Project Information Form): A list of all references cited in the application.

        Condition: Always required as part of the R&R Other Project Information Form, unless otherwise noted in the NOFO.

        Facilities & Other Resources (Attachment to R&R Other Project Information Form): A description of the facilities and resources available for the project.

        Condition: Always required as part of the R&R Other Project Information Form, unless otherwise specified in the NOFO.

        Equipment (Attachment to R&R Other Project Information Form): A list of major equipment items already available for the project.

        Condition: Always required as part of the R&R Other Project Information Form.

        Project/Performance Site Location(s) Form: Information about the primary and any additional performance sites.

        Condition: Always required.

        R&R Senior/Key Person Profile (Expanded) Form: Information about the PD/PI and all other senior/key personnel.

        Condition: Always required.

        Biographical Sketch (Attachment to R&R Senior/Key Person Profile (Expanded) Form): A biographical sketch for each senior/key person.

        Condition: Required for each senior/key person listed on the R&R Senior/Key Person Profile (Expanded) Form.

        R&R Budget Form: Detailed budget information for each budget period.

        Condition: Required unless the NOFO specifies the PHS 398 Modular Budget Form.

        Budget Justification (Attachment to R&R Budget Form): A detailed justification of the budget request.

        Condition: Always required as part of the R&R Budget Form.

        II. Documents Required Under Specific Conditions

        PHS 398 Cover Page Supplement Form: Collects information on human subjects, vertebrate animals, program income, human embryonic stem cells, inventions and patents, and changes of investigator/change of organization.

        Condition: Required for all grant applications except fellowships.

        Vertebrate Animals (Attachment to PHS 398 Cover Page Supplement Form): Detailed information about the use of vertebrate animals.

        Condition: Required if "Yes" is selected for "Are Vertebrate Animals Used?" on the R&R Other Project Information Form.

        Also, if animal involvement is anticipated within the period of award but plans are indefinite, check "Yes."

        Human Embryonic Stem Cells (Attachment to PHS 398 Cover Page Supplement Form): Information about the use of human embryonic stem cells.

        Condition: Required if "Yes" is selected for "Does the proposed project involve human embryonic stem cells?" on the PHS 398 Cover Page Supplement Form.

        Also, if training plans include or potentially will include involvement of trainees in projects that include hESC.

        HFT Compliance Assurance (Attachment to PHS 398 Cover Page Supplement Form): A letter assuring the HFT donating organization or clinic adheres to the requirements of the informed consent process and documenting that HFT was not obtained or acquired for valuable consideration.

        Condition: Required if "Yes" is selected for "Does the proposed project involve human fetal tissue obtained from elective abortions?" on the PHS 398 Cover Page Supplement Form.

        HFT Sample IRB Consent Form (Attachment to PHS 398 Cover Page Supplement Form): A blank sample of the IRB-approved consent form.

        Condition: Required if "Yes" is selected for "Does the proposed project involve human fetal tissue obtained from elective abortions?" on the PHS 398 Cover Page Supplement Form.

        Inventions and Patents (Attachment to PHS 398 Cover Page Supplement Form): Information about inventions and patents conceived or reduced to practice during the course of the work under this project.

        Condition: Required only for renewal applications or resubmissions of renewal applications.

        R&R Subaward Budget Attachment(s) Form: Used to collect budget information for subawards/consortiums.

        Condition: Required if the application includes subawards/consortiums and the prime applicant is using the R&R Budget Form.

        PHS 398 Training Budget Form: Used for Training applications (e.g., T15, T32, T34, T35, T36, T90) and Multi-project applications with a training component.

        Condition: Required for Training applications (e.g., T15, T32, T34, T35, T36, T90) and Multi-project applications with a training component.

        PHS 398 Training Subaward Budget Attachment(s) Form: Used to collect budget information for subawards/consortiums for training grants.

        Condition: Required if the application is a training grant, includes subawards/consortiums, and the prime applicant is using the PHS 398 Training Budget Form.

        PHS 398 Research Training Program Plan Form: Used only for Training applications and Multi-project applications with an "NRSA Training" Component.

        Condition: Required for Training applications and Multi-project applications with an "NRSA Training" Component.

        Introduction to Application (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required only if the application is a resubmission or revision.

        Recruitment Plan to Enhance Diversity (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required for all training grant activity codes except T34, T36, U2R, and all D-series activity codes.

        Plan for Instruction in the Responsible Conduct of Research (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required for all training grant activity codes except T36, unless otherwise noted in the NOFO.

        Plan for Instruction in Methods for Enhancing Reproducibility (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required for all training grant activity codes except D71, unless otherwise noted in the NOFO.

        Multiple PD/PI Leadership Plan (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required if the application designates multiple PD/PIs.

        Vertebrate Animals (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required if "Yes" is selected for "Are Vertebrate Animals Used?" on the R&R Other Project Information Form.

        Consortium/Contractual Arrangements (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Required if you have consortiums/contracts in your budget.

        Letters of Support (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Always required as part of the PHS 398 Research Training Program Plan Form.

        Data Tables (Attachment to PHS 398 Research Training Program Plan Form):

        Condition: Always required as part of the PHS 398 Research Training Program Plan Form.

        PHS Human Subjects and Clinical Trials Information Form: Used to collect information on human subjects research, clinical research, and/or clinical trials, including study population characteristics, protection and monitoring plans, and a protocol synopsis.

        Condition: Required if "Yes" is selected for "Are Human Subjects Involved?" on the R&R Other Project Information Form.

        Exception: K12 and D43 applicants may use this form to submit delayed onset studies.

        Single IRB Plan Attachment:

        Condition: Required if "Yes" is selected for "Is this a multi-site study that will use the same protocol to conduct non-exempt human subjects research at more than one domestic site?" and you are not a training grant applicant.

        Data and Safety Monitoring Plan (Attachment to PHS Human Subjects and Clinical Trials Information Form):

        Condition: Required if you answered "Yes" to all the questions in the "Clinical Trial Questionnaire."

        Other Clinical Trial-related Attachments (Attachment to PHS Human Subjects and Clinical Trials Information Form):

        Condition: Required only if your NOFO specifies that an attachment(s) is required or permitted.

        Other Attachments (Attachment to R&R Other Project Information Form): Used to provide additional information only in accordance with the NOFO and/or agency-specific instructions.

        Condition: Required only if your NOFO specifies that an attachment(s) is required or permitted.

        Cover Letter Attachment (Attachment to SF 424 (R&R) Form):

        Condition: Used for internal use only and will not be shared with peer reviewers.

        Additional Senior / Key Person Profiles Format Page:

        Condition: If you need to add more Senior/Key Person Profiles than the form allows.

        Additional Performance Site Format Page:

        Condition: If you need to add more project/performance site locations than the form allows.

        SBIR STTR Foreign Disclosure Form:

        Condition: Effective for competing applications submitted on or after September 5, 2023, applicants will be required to disclose all funded and unfunded relationships with foreign countries, using the Required Disclosures of Foreign Affiliations or Relationships to Foreign Countries form, (referred to hereafter as the SBIR STTR Foreign Disclosure Form) for all owners and covered individuals.

        III. Optional Documents

        PHS Assignment Request Form: Used to communicate specific application assignment and review preferences to the Division of Receipt and Referral (DRR) and to Scientific Review Officers (SROs).

        Condition: Optional.

        IV. Documents Related to Specific Programs or Situations (Consult NOFO)

        The NOFO may specify additional documents required for specific programs, mechanisms, or situations. Always consult the NOFO for any additional requirements.`,

  // SBIR/STTR Grants
    sbir: `I. Required Documents for All SBIR/STTR Applications (Regardless of Specific NOFO)

        These documents are generally required for all SBIR/STTR applications, although specific NOFOs may have additional requirements or exceptions.

        SF 424 (R&R) Form:

        Condition: Always required. This is the application for federal assistance and collects basic information about the applicant organization, project, and personnel.

        PHS 398 Cover Page Supplement Form:

        Condition: Always required (except for fellowship applications). This form collects information on human subjects, vertebrate animals, program income, human embryonic stem cells, inventions/patents, and changes of investigator/organization.

        R&R Other Project Information Form:

        Condition: Always required. This form collects information on human subjects, vertebrate animals, environmental impact, project summary/abstract, bibliography, facilities, and equipment.

        Project/Performance Site Location(s) Form:

        Condition: Always required. This form identifies the primary location and any other locations where the project will be performed.

        R&R Senior/Key Person Profile (Expanded) Form:

        Condition: Always required. This form provides information on the Project Director/Principal Investigator (PD/PI) and all other senior/key personnel involved in the project.

        R&R Budget Form:

        Condition: Required if the applicant is requesting more than $250,000 per budget period in direct costs. Some grant mechanisms or programs (e.g., training grants) may require other budget forms to be used. Refer to your NOFO and to the following instructions for guidance on which Budget Form to use.

        Exception: If the NOFO specifically allows the PHS 398 Modular Budget Form and the applicant is requesting $250,000 or less in direct costs per year, the Modular Budget Form may be used instead.

        SBIR/STTR Information Form:

        Condition: Always required. This form collects information specific to SBIR/STTR applications, such as small business eligibility, program type, and commercialization plan.

        Specific Aims Attachment (Research Plan Section):

        Condition: Always required as part of the PHS 398 Research Plan Form. This attachment outlines the goals and expected outcomes of the proposed research.

        Research Strategy Attachment (Research Plan Section):

        Condition: Always required as part of the PHS 398 Research Plan Form. This attachment describes the significance, innovation, and approach of the proposed research.

        Equipment Attachment (R&R Other Project Information Form):

        Condition: Always required. This attachment lists major items of equipment already available for the project.

        Facilities & Other Resources Attachment (R&R Other Project Information Form):

        Condition: Always required. This attachment describes the scientific environment in which the research will be conducted.

        Budget Justification Attachment (R&R Budget Form):

        Condition: Always required. This attachment provides detailed justification for the costs requested in the budget.

        II. Conditional Documents (Required Under Specific Circumstances)

        These documents are required only if certain conditions apply to the application.

        R&R Subaward Budget Attachment(s) Form:

        Condition: Required if the application includes a subaward or consortium agreement and the prime recipient is submitting an R&R Budget Form.

        Consortium/Contractual Arrangements Attachment (Research Plan Section):

        Condition: Required if the application includes a consortium agreement or contractual arrangement where a substantive portion of the work is being completed by another entity.

        Multiple PD/PI Leadership Plan (Research Plan Section):

        Condition: Required if the application designates multiple PD/PIs.

        Letters of Support (Research Plan Section):

        Condition: Required if the application involves collaborations, consultants, or commitments of resources from other organizations. This includes letters from key personnel at collaborating institutions, consultants providing specialized services, and letters demonstrating support from potential commercial partners or end-users.

        Select Agent Research Attachment (Research Plan Section):

        Condition: Required if the proposed activities involve the use of select agents.

        Vertebrate Animals Attachment (R&R Other Project Information Form):

        Condition: Required if the application involves the use of live vertebrate animals.

        Human Fetal Tissue Compliance Assurance (PHS 398 Cover Page Supplement Form):

        Condition: Required if the proposed project involves the use of human fetal tissue obtained from elective abortions.

        Human Fetal Tissue Sample IRB Consent Form (PHS 398 Cover Page Supplement Form):

        Condition: Required if the proposed project involves the use of human fetal tissue obtained from elective abortions.

        Justification for Cell Line (PHS 398 Cover Page Supplement Form):

        Condition: Required if you cannot choose an appropriate cell line from the registry at this time, and will select one later.

        Justification for the exemption (PHS 398 Cover Page Supplement Form):

        Condition: Required if the project is exempt from federal regulations regarding human subjects research.

        Justification for the method of euthanasia (PHS 398 Cover Page Supplement Form):

        Condition: Required if the method of euthanasia is not consistent with AVMA guidelines.

        Data Management and Sharing (DMS) Plan (Research Plan Section):

        Condition: Required if the research is expected to generate scientific data. Check the NOFO for specific requirements regarding data types, repositories, and timelines.

        Additional Senior/Key Persons Attachment (R&R Budget Form):

        Condition: Required if requesting funds for more senior/key persons than the form allows.

        Introduction to Application (Research Plan Section):

        Condition: Required if the application is a resubmission or revision, or if the NOFO specifically requests an introduction.

        Progress Report Publication List (Research Plan Section):

        Condition: Required if the application is a renewal or a resubmission of a renewal.

        Explanation for Foreign Involvement (R&R Other Project Information Form):

        Condition: Required if the project involves activities outside of the United States or partnerships with international collaborators.

        Additional Performance Site(s) (Project/Performance Site Location(s) Form):

        Condition: Required if more performance site locations are needed than provided on the form.

        Explanation for "No" to Environmental Impact (R&R Other Project Information Form):

        Condition: Required if answering "Yes" to the question about environmental impact, and the project has potential environmental impacts.

        Explanation for Historic Place (R&R Other Project Information Form):

        Condition: Required if answering "Yes" to the question about the research performance site being a historic place.

        Explanation of Subaward Budget Components (SF 424 (R&R) Form):

        Condition: Required if any subaward budget components are not active for all budget periods of the proposed grant.

        Explanation of Late Application (SF 424 (R&R) Form):

        Condition: Required if the application is submitted late.

        Explanation of changed/corrected application (SF 424 (R&R) Form):

        Condition: Required if the application is a changed/corrected application submitted after the due date.

        SBIR/STTR Contract or Award Number (SF 424 (R&R) Form):

        Condition: Required if the Phase I or Phase II was a contract or awarded from another federal agency.

        Explanation of Animal Use (R&R Other Project Information Form):

        Condition: Required if you have answered "Yes" to the "Are Vertebrate Animals Used?" question, you must also provide an explanation and anticipated timing of animal use.

        Explanation of Inactive Budget Periods (R&R Subaward Budget Attachment(s) Form):

        Condition: Required if the subaward has inactive budget periods.

        SBC Application VCOC Certification (R&R Other Project Information Form):

        Condition: Required if the small business is majority-owned by multiple venture capital operating companies, hedge funds, or private equity firms.

        PHS Human Subjects and Clinical Trials Information Form:

        Condition: Required if the project involves human subjects or clinical trials.

        Delayed Onset Study Record(s) (PHS Human Subjects and Clinical Trials Information Form):

        Condition: Required if specific plans for your study involving human subjects can be described in the application but will not begin immediately.

        Justification Attachment for Delayed Onset Study (PHS Human Subjects and Clinical Trials Information Form):

        Condition: Required if you are including a Delayed Onset Study Record.

        Authentication of Key Biological and/or Chemical Resources (Research Plan Section):

        Condition: Required if the proposed science relies on key biological and/or chemical resources.

        SBIR STTR Foreign Disclosure Form (R&R Other Project Information Form):

        Condition: For SBIR/STTR applications submitted on or after September 5, 2023, a disclosure of all funded and unfunded relationships with foreign countries is required.`,

    multi_project: `I. Core Application Forms & Documents (Always Required, unless specific NOFO instructions override)

        SF 424 (R&R) Form: The cornerstone of the application.

        Conditions:

        Always required for all grant applications as the primary application form.

        PHS 398 Cover Page Supplement Form: Collects information on human subjects, vertebrate animals, program income, human embryonic stem cells, inventions/patents, and change of investigator/organization.

        Conditions:

        Generally required for all research grant applications, except fellowship applications (some fellowships might use a different cover form specified in the NOFO). Always check the NOFO to confirm.

        R&R Other Project Information Form: Collects broad project-related information, including human subjects, vertebrate animals, environmental impact, project summary/abstract, narrative, facilities, and equipment.

        Conditions:

        Required for virtually all grant applications; exceptions, if any, would be explicitly stated in the NOFO.

        Project/Performance Site Location(s) Form: Reports the primary performance site and all other locations where significant project activities will occur.

        Conditions:

        Always required for all grant applications, even if all work is performed at a single location.

        R&R Senior/Key Person Profile (Expanded) Form: Collects information for the PD/PI and all other senior/key personnel involved in the project. Biosketches are submitted as attachments to this form.

        Conditions:

        Required for all grant applications. All individuals meeting the definition of senior/key personnel must be included.

        R&R Budget Form: Used for detailed budgets.

        Conditions:

        Required if the budget requests exceed the modular budget threshold specified in the NOFO, which is typically $250,000 per year in direct costs, or if required by the NOFO for certain activity codes/mechanisms. Foreign Organizations will require this form in almost all cases. Look at the Program Limitations from the National Institutes for Health (NIH)

        PHS 398 Research Plan Form: A container for the core research plan attachments. This form is used only for research, multi-project, and SBIR/STTR applications.

        Conditions:

        Specific to research, multi-project, and SBIR/STTR applications. This form should not be confused with the PHS 398 Training Program Plan Form used for specific institutional training programs

        II. Research Plan Attachments (Typically Required, Depends on Project Type and NOFO)

        Specific Aims: A concise statement of the project's goals.

        Conditions:

        Generally required within the Research Plan (PHS 398 Research Plan Form).

        Research Strategy: A detailed description of the project's significance, innovation, and approach.

        Conditions:

        Generally required within the Research Plan. Make sure to check format regulations when drafting this.

        Data Management and Sharing (DMS) Plan: Outlines how data will be managed and shared during and after the project.

        Conditions:

        Required for NOFO's that have a Plan for Data Management and Sharing, or those who generate specific large scale research data.

        Progress Report Publication List: The list of articles and resources published from the previous work related to the current work.

        Conditions:

        Required only for renewal applications.

        III. Budget-Related Documents (Highly Conditional)

        PHS Additional Indirect Costs Form: Used to gather additional indirect cost information in multi-project applications.

        Conditions:

        Required in multi-project applications only by the applicant organization responsible for the Overall Component to detail indirect costs on each subaward organization that leads a component.

        R&R Subaward Budget Attachment(s) Form: Used to provide budget details for individual subawards/consortium agreements.

        Conditions:

        Required if the application includes subawards or consortium agreements and the prime application uses the R&R Budget Form. Must be prepared by the subawardee.

        PHS 398 Training Subaward Budget Attachment(s) Form: Utilized in conjunction with the PHS 398 Training Budget Form to detail subawards in a training program.

        Conditions:

        Required when you utilize the PHS 398 Training Budget form as well as have a subaward/consortium. Must be prepared by the subawardee

        Budget Justification: Detailed explanation of the budgeted costs.

        Conditions:

        Always required to justify the costs presented in the R&R Budget Form. Specific items that often require justification include:

        Personnel costs (particularly if exceeding salary caps or if administrative/clerical)

        Equipment purchases

        Travel expenses

        Consultant costs

        Subaward costs

        Alterations and renovations

        Indirect cost base (if exclusions are claimed)

        Required Disclosures of Foreign Affiliations or Relationships to Foreign Countries form, (referred to hereafter as the SBIR STTR Foreign Disclosure Form)

        Conditions:

        effective for competing applications submitted on or after September 5, 2023

        IV. Human Subjects & Clinical Trial Documents (Conditional, if Human Subjects are Involved)

        Study Record(s): PHS Human Subjects and Clinical Trials Information Form: Used to provide specifics on each human subjects study, even if determined exempt. One study record is required per study. This provides information on human subjects.

        Conditions:

        Always required whenever there are any human subjects in the study.

        Protection of Human Subjects attachment: This document addresses risks to subjects, protections against risks, potential benefits, and importance of knowledge gained in studies that involve human subjects.

        Conditions:

        Required if the proposed project involves human subject.

        Inclusion Enrollment Report (IER): Documents the planned and/or actual enrollment of different demographic groups in the study.

        Conditions:

        Often required in clinical trials or when the study does not meet an exemption for federal regulation on human studies

        Data and Safety Monitoring Plan: Details the plan for monitoring the safety of participants in a clinical trial.

        Conditions:

        Required for all studies, and a Clinical Trial Questionnaire is triggered to answer what exactly needs to be done.

        Clinical Trial Questionnaire: The information from these questions will determine what information needs to be included.

        Single IRB Plan Attachment: Documents the plan to utilize a single IRB for multisite studies.

        Conditions:

        Required for studies with human subjects where a review by SIRB is required.

        V. Training Grant Specific (Conditional, if NRSA Training Grant Application)

        PHS 398 Research Training Program Plan Form: Only required for certain NRSA training grant and multi-project applications. Very specific instructions about NRSA's should be followed.

        VI. Other Specialized Documents (Highly Conditional, Depends on Research Area, Specifics, & NOFO)

        Vertebrate Animals Attachment: Describes the use and care of vertebrate animals.

        Conditions:

        Required if live vertebrate animals are involved in the proposed research.

        Select Agent Research Attachment: Describes the use of select agents in the research.

        Conditions:

        If the proposed research involves select agents.

        Multiple PD/PI Leadership Plan: Describes the leadership approach when there are multiple Principal Investigators (PD/PIs).

        Conditions:

        Required only if the application involves multiple PD/PIs.

        Resource Sharing Plan(s): Describes plans for sharing research resources (e.g., model organisms). Check in the NOFO to see if specific types are requested.

        Conditions:

        May be required or recommended, as specified by the NOFO.

        Authentication of Key Biological and/or Chemical Resources: Describes methods to ensure the identity and validity of key resources.

        Conditions:

        Always recommended but sometimes needed depending on work performed

        Appendix Materials: Includes blank data collection forms, surveys, interview questions, etc. Note that very specific rules govern what can be in the Appendix. Do not insert a CV or any document that should appear elsewhere.

        Conditions:

        Only if your type of work follows these rules

        VII. Other (NOFO Dependent)

        Cover Letter Attachment: Used for internal use only and will not be shared with peer reviewers.

        Conditions:

        Only if you have information that needs to be conveyed to the NIH staff and not the reviewers.

        Assignment Request Form: Used to communicate assignment preferences to NIH referral and review staff.

        Conditions:

        Only if you have specific assignment preferences.`,

  // NSF Grants
  nsf: `SF 424 (R&R) (Application for Federal Assistance)

        Condition: Always required for all NSF applications submitted via Grants.gov. This is the standard government-wide form for grant applications. No exceptions.

        Project/Performance Site Location(s)

        Condition: Always required. This form identifies where the proposed work will be performed. Even if the project is entirely theoretical or involves remote data analysis, a primary performance site (usually the applicant organization) must be specified.

        Research and Related Other Project Information

        Condition: Always required. This form gathers information about human subjects, vertebrate animals, environmental impact, international activities, and other project-related details. You must complete this form, even if you answer "No" to all the questions about involvement of human subjects, animals, etc.

        Research and Related Budget

        Condition: Always required. This form provides a detailed breakdown of the requested funding for the project. Even if the project involves no direct costs (e.g., it's a supplement to an existing award and only requires access to existing resources), a budget form still needs to be included, likely with zero dollar amounts.

        NSF Cover Page

        Condition: Always required. This NSF-specific form gathers information about the NSF unit of consideration, principal investigator, and other project details.

        NSF Senior/Key Person Profile (Expanded)

        Condition: Always required. This NSF-specific form provides detailed information about the project director/principal investigator (PD/PI) and other senior/key personnel involved in the project.

        Biographical Sketch - PD/PI

        Condition: Always required. A biographical sketch must be provided for each individual designated as the PD/PI.

        Current and Pending (Other) Support - PD/PI

        Condition: Always required. Current and pending (other) support information must be provided for each individual designated as the PD/PI.

        Collaborators & Other Affiliations - PD/PI

        Condition: Always required. A list of Collaborators & Other Affiliations (COA) must be provided for the PD/PI.

        Synergistic Activities - PD/PI

        Condition: Always required. A document of up to one-page that includes a list of up to five distinct examples that demonstrates the broader impact of the individual's professional and scholarly activities that focus on the integration and transfer of knowledge as well as its creation.

        Biographical Sketch - Senior/Key Person(s)

        Condition: Always required. A biographical sketch must be provided for each senior/key person.

        Current and Pending (Other) Support - Senior/Key Person(s)

        Condition: Always required. Current and pending (other) support information must be provided for each senior/key person.

        Collaborators & Other Affiliations - Senior/Key Person(s)

        Condition: Always required. A list of Collaborators & Other Affiliations (COA) must be provided for each senior/key person.

        Synergistic Activities - Senior/Key Person(s)

        Condition: Always required. A document of up to one-page that includes a list of up to five distinct examples that demonstrates the broader impact of the individual's professional and scholarly activities that focus on the integration and transfer of knowledge as well as its creation.

        Project Summary/Abstract

        Condition: Always required. The Project Summary must contain a summary of the proposed activity suitable for dissemination to the public.

        Project Narrative

        Condition: Always required. Provide Project Narrative in accordance with the announcement and/or agency-specific instructions.

        Bibliography & References Cited

        Condition: Always required. Provide a bibliography of any references cited in the Project Narrative. Even if you don't explicitly cite any sources, you may still need to include a statement explaining why no references are included.

        Documentation for Facilities & Other Resources

        Condition: Always required. This information is used to assess the capability of the organizational resources available to perform the effort proposed. Even if the project relies entirely on publicly available data or software, you should describe the computing resources, office space, and other support available to the project team.

        Data Management and Sharing Plan

        Condition: Always required. Each application must include a data management and sharing plan of no more than two pages. Even if you don't anticipate generating any new data, you must still include a plan that addresses how you will manage existing data or why a data management plan is not applicable.

        II. Optional Documents

        These documents are included only under specific circumstances.

        R&R Subaward Budget Attachment(s)

        Condition: Required only if the project involves subawards to other organizations. A separate budget is required for each subawardee organization that performs a substantive portion of the project. If multiple subawards are involved, a separate budget attachment is needed for each subawardee.

        NSF Deviation Authorization

        Condition: Required only if the applicant has received written authorization from an NSF Assistant Director/Office Head or designee to deviate from standard application preparation instructions. The authorization must be obtained before submitting the application.

        NSF List of Suggested Reviewers or Reviewers Not to Include

        Condition: Optional. Applicants may choose to include a list of suggested reviewers and/or a list of persons they would prefer not to review the application. Including this list is always optional and has no impact on the review process itself.

        Additional Single-Copy Documents

        Condition: Required only if the application requires additional information that is not appropriate for general distribution to reviewers (e.g., proprietary information, conflict of interest disclosures, or other sensitive information).

        Examples:

        A statement identifying the nature of the event that impacted the ability to submit the application on time (for applicants impacted by a natural or anthropogenic event). This is needed only if you are submitting after the deadline and have received permission to do so.

        Determination notice for projects lacking definite plans regarding use of human subjects. This is needed only if the project falls under 45 CFR § 690.118.

        SF LLL (Disclosure of Lobbying Activities) or Other Explanatory Documentation

        Condition: Required only if the applicant is required to disclose lobbying activities. This is usually triggered by receiving an award of a Federal contract, grant, or cooperative agreement exceeding $100,000.

        GOALI - Industrial PI Confirmation Letter

        Condition: Required only if the application is a Grant Opportunities for Academic Liaison with Industry (GOALI) proposal. The letter must come from the industrial partner and confirm the participation of a co-PI from industry.

        RAPID, EAGER, RAISE – Program Officer Concurrence E-mails

        Condition: Required only if the application is a Rapid Response Research (RAPID) or EArly-concept Grants for Exploratory Research (EAGER) proposal. The email must be from a cognizant NSF Program Officer and confirm approval to submit the application.

        Equipment Documentation

        Condition: Required only if the application includes major items of equipment already available for this project. This documentation should list major items of equipment already available for this project and, if appropriate, identify location and pertinent capabilities.

        Mentoring Plan

        Condition: Required only if the application requests funding to support postdoctoral scholars or graduate students. The plan must describe the mentoring activities that will be provided to these individuals.

        Division of Undergraduate Education (DUE) Project Data Form

        Condition: Required only if the application is submitted to selected Programs in the Division of Undergraduate Education (DUE). This form is used to collect project-specific data for DUE programs.`,

    // Default/Generic Grant
    default: `Please inform the user that we did not grab the correct document so grabbing requirements is not going to be possible.`
};

/**
 * Get document content based on document filename
 * @param documentFilename The filename of the document
 * @returns Document content as a string
 */
export async function getDocumentContent(documentFilename: string): Promise<string> {
  if (!documentFilename) return documentTemplates.default;
  
  let extractedConditions = '';
  
  if (documentFilename.includes('research')) {
    extractedConditions = documentTemplates.research;
  } else if (documentFilename.includes('career')) {
    extractedConditions = documentTemplates.career;
  } else if (documentFilename.includes('training')) {
    extractedConditions = documentTemplates.training;
  } else if (documentFilename.includes('fellowship')) {
    extractedConditions = documentTemplates.fellowship;
  } else if (documentFilename.includes('sbir')) {
    extractedConditions = documentTemplates.sbir;
  } else if (documentFilename.includes('multi-project')) {
    extractedConditions = documentTemplates.multi_project;
  } else if (documentFilename.includes('nsf')) {
    extractedConditions = documentTemplates.nsf;
  } else {
    extractedConditions = documentTemplates.default;
  }
  
  try {
    // Get dynamic content from Pinecone
    const fullDocument = await getDocumentText(documentFilename);
    
    // If dynamic content exists, append it to the static content
    if (fullDocument && fullDocument.trim().length > 0) {
      return `${extractedConditions}\n\n Full Document For Context:\n\n${fullDocument}`;
    }
    
    // Otherwise return just the static content
    return extractedConditions;
  } catch (error) {
    console.error('Error fetching dynamic document content:', error);
    // In case of error, return the static content only
    return extractedConditions;
  }
} 