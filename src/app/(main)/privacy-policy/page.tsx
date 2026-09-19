import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export const metadata: Metadata = {
  title: "Privacy Policy | Society Web Solutions",
  description: "Learn how Society Web Solutions collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#002880] text-white">
      {/* Header Banner */}
      <div className="bg-primary-100">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow w-full bg-[#002880]">
        <div className="w-full bg-[#002880] text-sm leading-relaxed text-white text-justify shadow-xl">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 lg:py-24 space-y-8">
            <p className="text-white">
              Thank you for choosing to be part of our community at Society Web Solutions OÜ, doing
              business as Society Web Solutions (&quot;Society Web Solutions&quot;, &quot;we&quot;,
              &quot;us&quot;, &quot;our&quot;). We are committed to protecting your personal
              information and your right to privacy. If you have any questions or concerns about
              this privacy notice, or our practices with regards to your personal information,
              please contact us at{" "}
              <a
                href="mailto:info@societywebsolutions.com"
                className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
              >
                info@societywebsolutions.com
              </a>
              .
            </p>

            <p className="text-white">
              When you visit our website societywebsolutions.com (the &quot;Website&quot;), and more
              generally, use any of our services (the &quot;Services&quot;, which include the
              Website), we appreciate that you are trusting us with your personal information. We
              take your privacy very seriously. In this privacy notice, we seek to explain to you in
              the clearest way possible what information we collect, how we use it and what rights
              you have in relation to it. We hope you take some time to read through it carefully, as
              it is important. If there are any terms in this privacy notice that you do not agree
              with, please discontinue use of our Services immediately.
            </p>

            <p className="text-white">
              This privacy notice applies to all information collected through our Services (which, as
              described above, includes our Website), as well as, any related services, sales,
              marketing or events.
            </p>

            <p className="font-bold text-white text-lg">
              Please read this privacy notice carefully as it will help you understand what we do
              with the information that we collect.
            </p>

            {/* Table of Contents */}
            <div className="bg-[#001b54] p-8 rounded-lg my-12 border border-blue-800 shadow-inner">
              <h3 className="font-bold text-white mb-6 uppercase tracking-widest text-base">
                TABLE OF CONTENTS
              </h3>
              <ul className="list-none space-y-3 text-white font-medium">
                <li>
                  <a
                    href="#section-1"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    1. WHAT INFORMATION DO WE COLLECT?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-2"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    2. HOW DO WE USE YOUR INFORMATION?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-3"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-4"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-5"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    5. DO WE USE GOOGLE MAPS PLATFORM APIS?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-6"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    6. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-7"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    7. HOW LONG DO WE KEEP YOUR INFORMATION?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-8"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    8. HOW DO WE KEEP YOUR INFORMATION SAFE?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-9"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    9. WHAT ARE YOUR PRIVACY RIGHTS?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-10"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    10. CONTROLS FOR DO-NOT-TRACK FEATURES
                  </a>
                </li>
                <li>
                  <a
                    href="#section-11"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    11. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-12"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    12. DO WE MAKE UPDATES TO THIS NOTICE?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-13"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
                  </a>
                </li>
                <li>
                  <a
                    href="#section-14"
                    className="hover:text-blue-300 transition-colors cursor-pointer block"
                  >
                    14. HOW CAN YOU REVIEW, UPDATE OR DELETE THE DATA WE COLLECT FROM YOU?
                  </a>
                </li>
              </ul>
            </div>

            {/* Section 1 */}
            <div id="section-1" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                1. WHAT INFORMATION DO WE COLLECT?
              </h2>
              <h3 className="font-bold text-white mb-2">Personal information you disclose to us</h3>
              <p className="italic">In Short: We collect personal information that you provide to us.</p>
              <p className="mt-3">
                We collect personal information that you voluntarily provide to us when you express an
                interest in obtaining information about us or our products and Services, when you
                participate in activities on the Website or otherwise when you contact us.
              </p>
              <p className="mt-3">
                The personal information that we collect depends on the context of your interactions
                with us and the Website, the choices you make and the products and features you use.
                The personal information we collect may include the following:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>Personal Information Provided by You.</strong> We collect email addresses;
                  names; phone numbers; contact preferences; mailing addresses; contact or
                  authentication data; and other similar information.
                </li>
                <li>
                  <strong>Payment Data.</strong> We may collect data necessary to process your payment
                  if you make purchases, such as your payment instrument number (such as a credit card
                  number), and the security code associated with your payment instrument. All payment
                  data is stored by Stripe. You may find their privacy notice link(s) here:{" "}
                  <a
                    href="https://stripe.com/en-ee/privacy"
                    className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://stripe.com/en-ee/privacy
                  </a>
                  .
                </li>
              </ul>
              <p className="mt-3">
                All personal information that you provide to us must be true, complete and accurate,
                and you must notify us of any changes to such personal information.
              </p>

              <h3 className="font-bold text-white mb-2 mt-6">Information automatically collected</h3>
              <p className="italic">
                In Short: Some information — such as your Internet Protocol (IP) address and/or
                browser and device characteristics — is collected automatically when you visit our
                Website.
              </p>
              <p className="mt-3">
                We automatically collect certain information when you visit, use or navigate the
                Website. This information does not reveal your specific identity (like your name or
                contact information) but may include device and usage information, such as your IP
                address, browser and device characteristics, operating system, language preferences,
                referring URLs, device name, country, location, information about how and when you use
                our Website and other technical information. This information is primarily needed to
                maintain the security and operation of our Website, and for our internal analytics and
                reporting purposes.
              </p>
              <p className="mt-3">
                Like many businesses, we also collect information through cookies and similar
                technologies.
              </p>
              <p className="mt-3">The information we collect includes:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>Log and Usage Data.</strong> Log and usage data is service-related,
                  diagnostic, usage and performance information our servers automatically collect when
                  you access or use our Website and which we record in log files. Depending on how you
                  interact with us, this log data may include your IP address, device information,
                  browser type and settings and information about your activity in the Website (such
                  as the date/time stamps associated with your usage, pages and files viewed, searches
                  and other actions you take such as which features you use), device event information
                  (such as system activity, error reports (sometimes called &apos;crash dumps&apos;)
                  and hardware settings).
                </li>
                <li>
                  <strong>Device Data.</strong> We collect device data such as information about your
                  computer, phone, tablet or other device you use to access the Website. Depending on
                  the device used, this device data may include information such as your IP address
                  (or proxy server), device and application identification numbers, location, browser
                  type, hardware model Internet service provider and/or mobile carrier, operating
                  system and system configuration information.
                </li>
                <li>
                  <strong>Location Data.</strong> We collect location data such as information about
                  your device&apos;s location, which can be either precise or imprecise. How much
                  information we collect depends on the type and settings of the device you use to
                  access the Website. For example, we may use GPS and other technologies to collect
                  geolocation data that tells us your current location (based on your IP address). You
                  can opt out of allowing us to collect this information either by refusing access to
                  the information or by disabling your Location setting on your device. Note however,
                  if you choose to opt out, you may not be able to use certain aspects of the Services.
                </li>
              </ul>

              <h3 className="font-bold text-white mb-2 mt-6">Information collected from other sources</h3>
              <p className="italic">
                In Short: We may collect limited data from public databases, marketing partners, and
                other outside sources.
              </p>
              <p className="mt-3">
                In order to enhance our ability to provide relevant marketing, offers and services to
                you and update our records, we may obtain information about you from other sources,
                such as public databases, joint marketing partners, affiliate programs, data
                providers, as well as from other third parties. This information includes mailing
                addresses, job titles, email addresses, phone numbers, intent data (or user behavior
                data), Internet Protocol (IP) addresses, social media profiles, social media URLs and
                custom profiles, for purposes of targeted advertising and event promotion.
              </p>
            </div>

            {/* Section 2 */}
            <div id="section-2" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                2. HOW DO WE USE YOUR INFORMATION?
              </h2>
              <p className="italic">
                In Short: We process your information for purposes based on legitimate business
                interests, the fulfillment of our contract with you, compliance with our legal
                obligations, and/or your consent.
              </p>
              <p className="mt-3">
                We use personal information collected via our Website for a variety of business
                purposes described below. We process your personal information for these purposes in
                reliance on our legitimate business interests, in order to enter into or perform a
                contract with you, with your consent, and/or for compliance with our legal
                obligations. We indicate the specific processing grounds we rely on next to each
                purpose listed below.
              </p>
              <p className="mt-3">We use the information we collect or receive:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>To send administrative information to you.</strong> We may use your personal
                  information to send you product, service and new feature information and/or
                  information about changes to our terms, conditions, and policies.
                </li>
                <li>
                  <strong>To protect our Services.</strong> We may use your information as part of our
                  efforts to keep our Website safe and secure (for example, for fraud monitoring and
                  prevention).
                </li>
                <li>
                  <strong>To enforce our terms, conditions and policies for business purposes</strong>
                  , to comply with legal and regulatory requirements or in connection with our
                  contract.
                </li>
                <li>
                  <strong>To respond to legal requests and prevent harm.</strong> If we receive a
                  subpoena or other legal request, we may need to inspect the data we hold to determine
                  how to respond.
                </li>
                <li>
                  <strong>Fulfill and manage your orders.</strong> We may use your information to
                  fulfill and manage your orders, payments, returns, and exchanges made through the
                  Website.
                </li>
                <li>
                  <strong>Administer prize draws and competitions.</strong> We may use your
                  information to administer prize draws and competitions when you elect to participate
                  in our competitions.
                </li>
                <li>
                  <strong>To deliver and facilitate delivery of services to the user.</strong> We may
                  use your information to provide you with the requested service.
                </li>
                <li>
                  <strong>To respond to user inquiries/offer support to users.</strong> We may use
                  your information to respond to your inquiries and solve any potential issues you
                  might have with the use of our Services.
                </li>
                <li>
                  <strong>To send you marketing and promotional communications.</strong> We and/or
                  our third-party marketing partners may use the personal information you send to us
                  for our marketing purposes, if this is in accordance with your marketing
                  preferences. For example, when expressing an interest in obtaining information about
                  us or our Website, subscribing to marketing or otherwise contacting us, we will
                  collect personal information from you. You can opt-out of our marketing emails at
                  any time.
                </li>
                <li>
                  <strong>Deliver targeted advertising to you.</strong> We may use your information to
                  develop and display personalized content and advertising (and work with third parties
                  who do so) tailored to your interests and/or location and to measure its
                  effectiveness.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div id="section-3" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?
              </h2>
              <p className="italic">
                In Short: We only share information with your consent, to comply with laws, to provide
                you with services, to protect your rights, or to fulfill business obligations.
              </p>
              <p className="mt-3">
                We may process or share your data that we hold based on the following legal basis:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>Consent:</strong> We may process your data if you have given us specific
                  consent to use your personal information for a specific purpose.
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> We may process your data when it is
                  reasonably necessary to achieve our legitimate business interests.
                </li>
                <li>
                  <strong>Performance of a Contract:</strong> Where we have entered into a contract
                  with you, we may process your personal information to fulfill the terms of our
                  contract.
                </li>
                <li>
                  <strong>Legal Obligations:</strong> We may disclose your information where we are
                  legally required to do so in order to comply with applicable law, governmental
                  requests, a judicial proceeding, court order, or legal process, such as in response
                  to a court order or a subpoena.
                </li>
                <li>
                  <strong>Vital Interests:</strong> We may disclose your information where we believe
                  it is necessary to investigate, prevent, or take action regarding potential
                  violations of our policies, suspected fraud, situations involving potential threats
                  to the safety of any person and illegal activities, or as evidence in litigation in
                  which we are involved.
                </li>
              </ul>
              <p className="mt-3">
                More specifically, we may need to process your data or share your personal information
                in the following situations:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>Business Transfers.</strong> We may share or transfer your information in
                  connection with, or during negotiations of, any merger, sale of company assets,
                  financing, or acquisition of all or a portion of our business to another company.
                </li>
                <li>
                  <strong>Affiliates.</strong> We may share your information with our affiliates, in
                  which case we will require those affiliates to honor this privacy notice. Affiliates
                  include our parent company and any subsidiaries, joint venture partners or other
                  companies that we control or that are under common control with us.
                </li>
                <li>
                  <strong>Business Partners.</strong> We may share your information with our business
                  partners to offer you certain products, services or promotions.
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div id="section-4" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
              </h2>
              <p className="italic">
                In Short: We may use cookies and other tracking technologies to collect and store your
                information.
              </p>
              <p className="mt-3">
                We may use cookies and similar tracking technologies (like web beacons and pixels) to
                access or store information. Specific information about how we use such technologies
                and how you can refuse certain cookies is set out in our Cookie Notice.
              </p>
            </div>

            {/* Section 5 */}
            <div id="section-5" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                5. DO WE USE GOOGLE MAPS PLATFORM APIS?
              </h2>
              <p className="italic">
                In Short: Yes, we use Google Maps Platform APIs for the purpose of providing better
                service.
              </p>
              <p className="mt-3">
                This Website uses Google Maps Platform APIs which are subject to Google’s Terms of
                Service. You may find the Google Maps Platform Terms of Service here. To find out more
                about Google’s Privacy Policy, please refer to this link. We obtain and store on your
                device (&apos;cache&apos;) your location. You may revoke your consent anytime by
                contacting us at the contact details provided at the end of this document.
              </p>
            </div>

            {/* Section 6 */}
            <div id="section-6" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                6. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?
              </h2>
              <p className="italic">
                In Short: We may transfer, store, and process your information in countries other than
                your own.
              </p>
              <p className="mt-3">
                Our servers are located in United States, and Estonia. If you are accessing our Website
                from outside United States, and Estonia, please be aware that your information may be
                transferred to, stored, and processed by us in our facilities and by those third parties
                with whom we may share your personal information, in United States, United Kingdom,
                India, Nepal, Argentina, Russia, and other countries.
              </p>
              <p className="mt-3">
                If you are a resident in the European Economic Area, then these countries may not
                necessarily have data protection laws or other similar laws as comprehensive as those
                in your country. We will however take all necessary measures to protect your personal
                information in accordance with this privacy notice and applicable law.
              </p>
              <p className="font-bold text-white mt-4">
                European Commission&apos;s Standard Contractual Clauses:
              </p>
              <p className="mt-3">
                We have implemented measures to protect your personal information, including by using
                the European Commission&apos;s Standard Contractual Clauses for transfers of personal
                information between our group companies and between us and our third-party providers.
                These clauses require all recipients to protect all personal information that they
                process originating from the EEA in accordance with European data protection laws and
                regulations. Our Standard Contractual Clauses can be provided upon request. We have
                implemented similar appropriate safeguards with our third-party service providers and
                partners and further details can be provided upon request.
              </p>
            </div>

            {/* Section 7 */}
            <div id="section-7" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                7. HOW LONG DO WE KEEP YOUR INFORMATION?
              </h2>
              <p className="italic">
                In Short: We keep your information for as long as necessary to fulfill the purposes
                outlined in this privacy notice unless otherwise required by law.
              </p>
              <p className="mt-3">
                We will only keep your personal information for as long as it is necessary for the
                purposes set out in this privacy notice, unless a longer retention period is required
                or permitted by law (such as tax, accounting or other legal requirements). No purpose
                in this notice will require us keeping your personal information for longer than 2
                years.
              </p>
              <p className="mt-3">
                When we have no ongoing legitimate business need to process your personal information,
                we will either delete or anonymize such information, or, if this is not possible (for
                example, because your personal information has been stored in backup archives), then we
                will securely store your personal information and isolate it from any further
                processing until deletion is possible.
              </p>
            </div>

            {/* Section 8 */}
            <div id="section-8" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                8. HOW DO WE KEEP YOUR INFORMATION SAFE?
              </h2>
              <p className="italic">
                In Short: We aim to protect your personal information through a system of
                organizational and technical security measures.
              </p>
              <p className="mt-3">
                We have implemented appropriate technical and organizational security measures
                designed to protect the security of any personal information we process. However,
                despite our safeguards and efforts to secure your information, no electronic
                transmission over the Internet or information storage technology can be guaranteed to
                be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other
                unauthorized third parties will not be able to defeat our security, and improperly
                collect, access, steal, or modify your information. Although we will do our best to
                protect your personal information, transmission of personal information to and from
                our Website is at your own risk. You should only access the Website within a secure
                environment.
              </p>
            </div>

            {/* Section 9 */}
            <div id="section-9" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                9. WHAT ARE YOUR PRIVACY RIGHTS?
              </h2>
              <p className="italic">
                In Short: In some regions, such as the European Economic Area, you have rights that
                allow you greater access to and control over your personal information. You may review,
                change, or terminate your account at any time.
              </p>
              <p className="mt-3">
                In some regions (like the European Economic Area), you have certain rights under
                applicable data protection laws. These may include the right (i) to request access and
                obtain a copy of your personal information, (ii) to request rectification or erasure;
                (iii) to restrict the processing of your personal information; and (iv) if applicable,
                to data portability. In certain circumstances, you may also have the right to object
                to the processing of your personal information. To make such a request, please use the
                contact details provided below. We will consider and act upon any request in accordance
                with applicable data protection laws.
              </p>
              <p className="mt-3">
                If we are relying on your consent to process your personal information, you have the
                right to withdraw your consent at any time. Please note however that this will not affect
                the lawfulness of the processing before its withdrawal, nor will it affect the
                processing of your personal information conducted in reliance on lawful processing
                grounds other than consent.
              </p>
              <p className="mt-3">
                If you are a resident in the European Economic Area and you believe we are unlawfully
                processing your personal information, you also have the right to complain to your local
                data protection supervisory authority. You can find their contact details here:{" "}
                <a
                  href="http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm
                </a>
                .
              </p>
              <p className="mt-3">
                If you are a resident in Switzerland, the contact details for the data protection
                authorities are available here:{" "}
                <a
                  href="https://www.edoeb.admin.ch/edoeb/en/home.html"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.edoeb.admin.ch/edoeb/en/home.html
                </a>
                .
              </p>
              <p className="mt-3">
                <strong>Cookies and similar technologies:</strong> Most Web browsers are set to accept
                cookies by default. If you prefer, you can usually choose to set your browser to remove
                cookies and to reject cookies. If you choose to remove cookies or reject cookies, this
                could affect certain features or services of our Website. To opt-out of interest-based
                advertising by advertisers on our Website visit{" "}
                <a
                  href="http://www.aboutads.info/choices/"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  http://www.aboutads.info/choices/
                </a>
                .
              </p>
            </div>

            {/* Section 10 */}
            <div id="section-10" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                10. CONTROLS FOR DO-NOT-TRACK FEATURES
              </h2>
              <p className="mt-3">
                Most web browsers and some mobile operating systems and mobile applications include a
                Do-Not-Track (&quot;DNT&quot;) feature or setting you can activate to signal your
                privacy preference not to have data about your online browsing activities monitored and
                collected. At this stage no uniform technology standard for recognizing and
                implementing DNT signals has been finalized. As such, we do not currently respond to DNT
                browser signals or any other mechanism that automatically communicates your choice not
                to be tracked online. If a standard for online tracking is adopted that we must follow
                in the future, we will inform you about that practice in a revised version of this
                privacy notice.
              </p>
            </div>

            {/* Section 11 */}
            <div id="section-11" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                11. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
              </h2>
              <p className="italic">
                In Short: Yes, if you are a resident of California, you are granted specific rights
                regarding access to your personal information.
              </p>
              <p className="mt-4">
                California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot;
                law, permits our users who are California residents to request and obtain from us, once
                a year and free of charge, information about categories of personal information (if any)
                we disclosed to third parties for direct marketing purposes and the names and addresses
                of all third parties with which we shared personal information in the immediately
                preceding calendar year. If you are a California resident and would like to make such a
                request, please submit your request in writing to us using the contact information
                provided below.
              </p>
              <p className="mt-4">
                If you are under 18 years of age, reside in California, and have a registered account
                with the Website, you have the right to request removal of unwanted data that you
                publicly post on the Website. To request removal of such data, please contact us using
                the contact information provided below, and include the email address associated with
                your account and a statement that you reside in California. We will make sure the data
                is not publicly displayed on the Website, but please be aware that the data may not be
                completely or comprehensively removed from all our systems (e.g. backups, etc.).
              </p>

              <h3 className="font-bold text-white mb-2 mt-6">CCPA Privacy Notice</h3>
              <p>The California Code of Regulations defines a &quot;resident&quot; as:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4 mt-3">
                <li>
                  every individual who is in the State of California for other than a temporary or
                  transitory purpose and
                </li>
                <li>
                  every individual who is domiciled in the State of California who is outside the
                  State of California for a temporary or transitory purpose
                </li>
              </ul>
              <p>All other individuals are defined as &quot;non-residents.&quot;</p>
              <p className="mt-3">
                If this definition of &quot;resident&quot; applies to you, we must adhere to certain
                rights and obligations regarding your personal information.
              </p>

              <h3 className="font-bold text-white mb-2 mt-6">
                What categories of personal information do we collect?
              </h3>
              <p>
                We have collected the following categories of personal information in the past twelve
                (12) months:
              </p>

              <div className="overflow-x-auto my-6">
                <table className="min-w-full bg-[#001b54] border border-blue-900 text-left">
                  <thead>
                    <tr className="bg-[#002e8a]">
                      <th className="py-2.5 px-4 border-b border-blue-900 text-left text-white font-bold">
                        Category
                      </th>
                      <th className="py-2.5 px-4 border-b border-blue-900 text-left text-white font-bold">
                        Examples
                      </th>
                      <th className="py-2.5 px-4 border-b border-blue-900 text-left text-white font-bold">
                        Collected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-blue-900/50">
                      <td className="py-2.5 px-4 font-medium align-top">A. Identifiers</td>
                      <td className="py-2.5 px-4 align-top">
                        Contact details, such as real name, alias, postal address, telephone or mobile
                        contact number, unique personal identifier, online identifier, Internet
                        Protocol address, email address and account name
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white underline decoration-green-400/50 align-top">
                        YES
                      </td>
                    </tr>
                    <tr className="border-b border-blue-900/50 bg-[#002060]">
                      <td className="py-2.5 px-4 font-medium align-top">
                        B. Personal information categories listed in the California Customer Records
                        statute
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        Name, contact information, education, employment, employment history and
                        financial information
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white underline decoration-green-400/50 align-top">
                        YES
                      </td>
                    </tr>
                    <tr className="border-b border-blue-900/50">
                      <td className="py-2.5 px-4 font-medium align-top">
                        C. Protected classification characteristics under California or federal law
                      </td>
                      <td className="py-2.5 px-4 align-top">Gender and date of birth</td>
                      <td className="py-2.5 px-4 font-bold text-white underline decoration-green-400/50 align-top">
                        YES
                      </td>
                    </tr>
                    <tr className="border-b border-blue-900/50 bg-[#002060]">
                      <td className="py-2.5 px-4 font-medium align-top">D. Commercial information</td>
                      <td className="py-2.5 px-4 align-top">
                        Transaction information, purchase history, financial details and payment
                        information
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr className="border-b border-blue-900/50">
                      <td className="py-2.5 px-4 font-medium align-top">E. Biometric information</td>
                      <td className="py-2.5 px-4 align-top">Fingerprints and voiceprints</td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr className="border-b border-blue-900/50 bg-[#002060]">
                      <td className="py-2.5 px-4 font-medium align-top">
                        F. Internet or other similar network activity
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        Browsing history, search history, online behavior, interest data, and
                        interactions with our and other websites, applications, systems and
                        advertisements
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr className="border-b border-blue-900/50">
                      <td className="py-2.5 px-4 font-medium align-top">G. Geolocation data</td>
                      <td className="py-2.5 px-4 align-top">Device location</td>
                      <td className="py-2.5 px-4 font-bold text-white underline decoration-green-400/50 align-top">
                        YES
                      </td>
                    </tr>
                    <tr className="border-b border-blue-900/50 bg-[#002060]">
                      <td className="py-2.5 px-4 font-medium align-top">
                        H. Audio, electronic, visual, thermal, olfactory, or similar information
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        Images and audio, video or call recordings created in connection with our
                        business activities
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr className="border-b border-blue-900/50">
                      <td className="py-2.5 px-4 font-medium align-top">
                        I. Professional or employment-related information
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        Business contact details in order to provide you our services at a business
                        level, job title as well as work history and professional qualifications if you
                        apply for a job with us
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr className="border-b border-blue-900/50 bg-[#002060]">
                      <td className="py-2.5 px-4 font-medium align-top">J. Education Information</td>
                      <td className="py-2.5 px-4 align-top">
                        Student records and directory information
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white align-top">NO</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium align-top">
                        K. Inferences drawn from other personal information
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        Inferences drawn from any of the collected personal information listed above to
                        create a profile or summary about, for example, an individual’s preferences and
                        characteristics
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white underline decoration-green-400/50 align-top">
                        YES
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-3">
                We may also collect other personal information outside of these categories instances
                where you interact with us in-person, online, or by phone or mail in the context of:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Receiving help through our customer support channels;</li>
                <li>Participation in customer surveys or contests; and</li>
                <li>
                  Facilitation in the delivery of our Services and to respond to your inquiries.
                </li>
              </ul>

              <h3 className="font-bold text-white mb-2 mt-6">
                How do we use and share your personal information?
              </h3>
              <p className="mt-3">
                More information about our data collection and sharing practices can be found in this
                privacy notice.
              </p>
              <p className="mt-3">
                If you are using an authorized agent to exercise your right to opt-out we may deny a
                request if the authorized agent does not submit proof that they have been validly
                authorized to act on your behalf.
              </p>

              <h3 className="font-bold text-white mb-2 mt-6">
                Will your information be shared with anyone else?
              </h3>
              <p className="mt-3">
                We may disclose your personal information with our service providers pursuant to a
                written contract between us and each service provider. Each service provider is a
                for-profit entity that processes the information on our behalf.
              </p>
              <p className="mt-3">
                You may contact us by email at info@societywebsolutions.com, by visiting{" "}
                <Link
                  href="/contact-us"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                >
                  societywebsolutions.com/contact-us/
                </Link>
                , or by referring to the contact details at the bottom of this document.
              </p>
              <p className="mt-3">
                Society Web Solutions OÜ has not disclosed or sold any personal information to third
                parties for a business or commercial purpose in the preceding 12 months. Society Web
                Solutions OÜ will not sell personal information in the future belonging to website
                visitors, users and other consumers.
              </p>

              <h3 className="font-bold text-white mb-2 mt-6">
                Your rights with respect to your personal data
              </h3>
              <p className="font-bold mt-4">
                Right to request deletion of the data - Request to delete
              </p>
              <p className="mt-2">
                You can ask for the deletion of your personal information. If you ask us to delete
                your personal information, we will respect your request and delete your personal
                information, subject to certain exceptions provided by law, such as (but not limited
                to) the exercise by another consumer of his or her right to free speech, our
                compliance requirements resulting from a legal obligation or any processing that may be
                required to protect against illegal activities.
              </p>

              <p className="font-bold mt-4">Right to be informed - Request to know</p>
              <p className="mt-2">Depending on the circumstances, you have a right to know:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>whether we collect and use your personal information;</li>
                <li>the categories of personal information that we collect;</li>
                <li>the purposes for which the collected personal information is used;</li>
                <li>whether we sell your personal information to third parties;</li>
                <li>
                  the categories of personal information that we sold or disclosed for a business
                  purpose;
                </li>
                <li>
                  the categories of third parties to whom the personal information was sold or
                  disclosed for a business purpose; and
                </li>
                <li>
                  the business or commercial purpose for collecting or selling personal information.
                </li>
              </ul>
              <p className="mt-4">
                We may use your personal information for our own business purposes, such as for
                undertaking internal research for technological development and demonstration. This is
                not considered to be &quot;selling&quot; of your personal data.
              </p>
              <p className="mt-3">
                In accordance with applicable law, we are not obligated to provide or delete consumer
                information that is de-identified in response to a consumer request or to re-identify
                individual data to verify a consumer request.
              </p>

              <p className="font-bold mt-4">
                Right to Non-Discrimination for the Exercise of a Consumer’s Privacy Rights
              </p>
              <p className="mt-2">
                We will not discriminate against you if you exercise your privacy rights.
              </p>

              <p className="font-bold mt-4">Verification process</p>
              <p className="mt-2">
                Upon receiving your request, we will need to verify your identity to determine you are
                the same person about whom we have the information in our system. These verification
                efforts require us to ask you to provide information so that we can match it with
                information you have previously provided us. For instance, depending on the type of
                request you submit, we may ask you to provide certain information so that we can match
                the information you provide with the information we already have on file, or we may
                contact you through a communication method (e.g. phone or email) that you have
                previously provided to us. We may also use other verification methods as the
                circumstances dictate.
              </p>
              <p className="mt-3">
                We will only use personal information provided in your request to verify your identity
                or authority to make the request. To the extent possible, we will avoid requesting
                additional information from you for the purposes of verification. If, however, we
                cannot verify your identity from the information already maintained by us, we may
                request that you provide additional information for the purposes of verifying your
                identity, and for security or fraud-prevention purposes. We will delete such
                additionally provided information as soon as we finish verifying you.
              </p>

              <p className="font-bold mt-4">Other privacy rights</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>you may object to the processing of your personal data</li>
                <li>
                  you may request correction of your personal data if it is incorrect or no longer
                  relevant, or ask to restrict the processing of the data
                </li>
                <li>
                  you can designate an authorized agent to make a request under the CCPA on your
                  behalf. We may deny a request from an authorized agent that does not submit proof that
                  they have been validly authorized to act on your behalf in accordance with the CCPA.
                </li>
                <li>
                  you may request to opt-out from future selling of your personal information to third
                  parties. Upon receiving a request to opt-out, we will act upon the request as soon as
                  feasibly possible, but no later than 15 days from the date of the request submission.
                </li>
              </ul>
              <p className="mt-3">
                To exercise these rights, you can contact us by email at{" "}
                <a
                  href="mailto:info@societywebsolutions.com"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                >
                  info@societywebsolutions.com
                </a>
                , by visiting{" "}
                <Link
                  href="/contact-us"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                >
                  societywebsolutions.com/contact-us/
                </Link>
                , or by referring to the contact details at the bottom of this document. If you have a
                complaint about how we handle your data, we would like to hear from you.
              </p>
            </div>

            {/* Section 12 */}
            <div id="section-12" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                12. DO WE MAKE UPDATES TO THIS NOTICE?
              </h2>
              <p className="italic">
                In Short: Yes, we will update this notice as necessary to stay compliant with relevant
                laws.
              </p>
              <p className="mt-3">
                We may update this privacy notice from time to time. The updated version will be
                indicated by an updated &quot;Revised&quot; date and the updated version will be
                effective as soon as it is accessible. If we make material changes to this privacy
                notice, we may notify you either by prominently posting a notice of such changes or by
                directly sending you a notification. We encourage you to review this privacy notice
                frequently to be informed of how we are protecting your information.
              </p>
            </div>

            {/* Section 13 */}
            <div id="section-13" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
              </h2>
              <p className="mt-3">
                If you have questions or comments about this notice, you may contact our Data
                Protection Officer (DPO), Ragnar Ridamäe, by email at{" "}
                <a href="mailto:ragnar@societywebsolutions.com" className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all">
                  ragnar@societywebsolutions.com
                </a>
                , by phone at +372 5681 3501, or by post to:
              </p>
              <p className="mt-4 font-bold">
                Society Web Solutions OÜ
                <br />
                Ragnar Ridamäe
                <br />
                Gonsiori 8-27
                <br />
                Tallinn, Harjumaa 10117
                <br />
                Estonia
              </p>
            </div>

            {/* Section 14 */}
            <div id="section-14" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-white mb-2 mt-8">
                14. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
              </h2>
              <p className="mt-3">
                Based on the applicable laws of your country, you may have the right to request access
                to the personal information we collect from you, change that information, or delete it
                in some circumstances. To request to review, update, or delete your personal
                information, please visit:{" "}
                <Link
                  href="/contact-us"
                  className="text-white underline decoration-blue-400/50 hover:decoration-white transition-all"
                >
                  societywebsolutions.com/contact-us/
                </Link>
                . We will respond to your request within 30 days.
              </p>
            </div>
          </div>
        </div>

        {/* Support & Newsletter Section */}
        <div className="w-full bg-[#F3F4F6] py-12">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px]">
            <SupportNewsletter noPadding />
          </div>
        </div>
      </main>
    </div>
  );
}
