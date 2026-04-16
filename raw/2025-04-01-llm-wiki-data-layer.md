---
title: "LLM Wiki + Data Layer (Postgres)"
source: "https://www.linkedin.com/posts/dascalescu_karpathys-llm-knowledge-base-got-18m-views-share-7447375117183115265-GyEN"
date: 2025-04-01
author: "Claudiu Dascalescu"
ingested: 2026-04-15T16:44:00.660Z
tags: [knowledge]
---

Title: Karpathy's LLM knowledge base got 18M views. Everyone's building one now. There's a gap in it that took me too long to notice. His pattern is brilliant for knowledge: markdown files, wiki pages… | Claudiu Dascalescu

URL Source: https://www.linkedin.com/posts/dascalescu_karpathys-llm-knowledge-base-got-18m-views-share-7447375117183115265-GyEN

Markdown Content:
# Karpathy's LLM knowledge base got 18M views. Everyone's building one now. There's a gap in it that took me too long to notice. His pattern is brilliant for knowledge: markdown files, wiki pages… | Claudiu Dascalescu

Agree & Join LinkedIn

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).

[Skip to main content](https://www.linkedin.com/posts/dascalescu_karpathys-llm-knowledge-base-got-18m-views-share-7447375117183115265-GyEN#main-content)[LinkedIn](https://www.linkedin.com/?trk=public_post_nav-header-logo)
*   [Top Content](https://www.linkedin.com/top-content?trk=public_post_guest_nav_menu_topContent)
*   [People](https://www.linkedin.com/pub/dir/+/+?trk=public_post_guest_nav_menu_people)
*   [Learning](https://www.linkedin.com/learning/search?trk=public_post_guest_nav_menu_learning)
*   [Jobs](https://www.linkedin.com/jobs/search?trk=public_post_guest_nav_menu_jobs)
*   [Games](https://www.linkedin.com/games?trk=public_post_guest_nav_menu_games)

[Sign in](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&fromSignIn=true&trk=public_post_nav-header-signin)[Join now](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_nav-header-join)[![Image 1](https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2)](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&fromSignIn=true&trk=public_post_nav-header-signin)

# Claudiu Dascalescu’s Post

[![Image 2: Claudiu Dascalescu](https://media.licdn.com/dms/image/v2/C4E03AQHYB68D3TQdAg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1568965809232?e=2147483647&v=beta&t=ROdNruRXjM2TyWIPsuQdEkD9jSXWu6JoPy06m9NBw0M)](https://ro.linkedin.com/in/dascalescu?trk=public_post_feed-actor-image)

[Claudiu Dascalescu](https://ro.linkedin.com/in/dascalescu?trk=public_post_feed-actor-name)

Never automate something that shouldn’t exist.

 1w 

*   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Karpathy's LLM knowledge base got 18M views. Everyone's building one now. There's a gap in it that took me too long to notice. His pattern is brilliant for knowledge: markdown files, wiki pages, backlinks, concept synthesis. The LLM maintains everything. You handle the thinking. If your work is research and idea generation, it's all you need. But if you need to make a quarterly planning decision, a wiki page will only get you halfway there. You need activation rates, not a summary of what activation means. You need pipeline numbers, not a positioning doc. I spent an embarrassing amount of time trying to make markdown tables work for tracking weekly metrics before admitting what should have been obvious: knowledge and data behave differently. A concept page gets rewritten and refined over time. Last week's signup numbers don't get rewritten. They're a fact. Next week adds another row. So I added a Postgres database alongside the wiki. Two compilers instead of one: Text sources → LLM compiles → Wiki (markdown files) Data sources → LLM compiles → Database (Postgres) The interesting part: the two layers reference each other constantly. A weekly report (wiki) cites a SQL query that produced the numbers (database). A table of experiment results gets interpreted in a wiki page that explains what to do about them. When activation dropped from 79% to 38%, the LLM went to the database for numbers by channel, then to the wiki for last week's context. Turns out the previous cohort included test accounts that inflated the baseline. Neither layer alone could have answered that. Everything accumulates. Each weekly report adds context that makes the next analysis better.

*   ![Image 3: No alternative text description for this image](https://media.licdn.com/dms/image/v2/D4D22AQFEAHeNPSpMcQ/feedshare-shrink_1280/B4DZ1pkNLAGoAM-/0/1775592592322?e=2147483647&v=beta&t=3la5hLvoSArnYHxrHaNM-mFNTNnEZcdyIWaVKpzYxOM)

[![Image 4](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 5](https://static.licdn.com/aero-v1/sc/h/a0e8rff6djeoq8iympcysuqfu)![Image 6](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v) 28](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_social-actions-reactions)[3 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment-cta)

 Share 
*   Copy
*   LinkedIn
*   Facebook
*   X

[![Image 7: Claudiu Dascalescu](https://media.licdn.com/dms/image/v2/C4E03AQHYB68D3TQdAg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1568965809232?e=2147483647&v=beta&t=ROdNruRXjM2TyWIPsuQdEkD9jSXWu6JoPy06m9NBw0M)](https://ro.linkedin.com/in/dascalescu?trk=public_post_comment_actor-image)

[Claudiu Dascalescu](https://ro.linkedin.com/in/dascalescu?trk=public_post_comment_actor-name)
Never automate something that shouldn’t exist.

 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Wrote up the full pattern with directory structure, setup, and examples: [https://xata.io/blog/llm-knowledge-bases](https://xata.io/blog/llm-knowledge-bases?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_reply) 1 Reaction 

[![Image 8: Sofia Mladenova, graphic](https://media.licdn.com/dms/image/v2/D4D03AQGgyliFtD4X2g/profile-displayphoto-scale_400_400/B4DZkMsnhcGsAg-/0/1756854647425?e=2147483647&v=beta&t=gSkorKPxV7JUJAJTl1nrTKO4JtybwM3lm0XfVnW0kGM)](https://pt.linkedin.com/in/smlmark?trk=public_post_comment_actor-image)

[Sofia Mladenova](https://pt.linkedin.com/in/smlmark?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

The two-compiler pattern is interesting. Knowledge decays gracefully but data doesn't. Most people learn this the hard way with a spreadsheet inside a doc.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_reactions) 2 Reactions 

[![Image 9: Oleksii Klochai, graphic](https://www.linkedin.com/posts/dascalescu_karpathys-llm-knowledge-base-got-18m-views-share-7447375117183115265-GyEN)](https://de.linkedin.com/in/oklochai?trk=public_post_comment_actor-image)

[Oleksii Klochai](https://de.linkedin.com/in/oklochai?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

A neat solution

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_comment_reactions) 2 Reactions 

[See more comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_see-more-comments)
To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_feed-cta-banner-cta)

![Image 10](https://media.licdn.com/dms/image/v2/D4D16AQG7ZszMYXiz1g/profile-displaybackgroundimage-shrink_350_1400/B4DZh1HpF0GkAc-/0/1754311594742?e=2147483647&v=beta&t=BAp_NLlO-Nu2hzjNArS6UgAmLPBtM9D0X9rATCWDWTs)

![Image 11: Claudiu Dascalescu](https://media.licdn.com/dms/image/v2/C4E03AQHYB68D3TQdAg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1568965809232?e=2147483647&v=beta&t=ROdNruRXjM2TyWIPsuQdEkD9jSXWu6JoPy06m9NBw0M)
2,228 followers

*   [1,215 Posts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fin%2Fdascalescu%2Frecent-activity%2F&trk=public_post_follow-posts)

[View Profile](https://ro.linkedin.com/in/dascalescu?trk=public_post_follow-view-profile)[Follow](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Ffeed%2Fupdate%2Furn%3Ali%3Aactivity%3A7447375118365941761&trk=public_post_follow)

## Explore content categories

*   [Career](https://www.linkedin.com/top-content/career/)
*   [Productivity](https://www.linkedin.com/top-content/productivity/)
*   [Finance](https://www.linkedin.com/top-content/finance/)
*   [Soft Skills & Emotional Intelligence](https://www.linkedin.com/top-content/soft-skills-emotional-intelligence/)
*   [Project Management](https://www.linkedin.com/top-content/project-management/)
*   [Education](https://www.linkedin.com/top-content/education/)
*   [Technology](https://www.linkedin.com/top-content/technology/)
*   [Leadership](https://www.linkedin.com/top-content/leadership/)
*   [Ecommerce](https://www.linkedin.com/top-content/ecommerce/)
*   [User Experience](https://www.linkedin.com/top-content/user-experience/)

 Show more  Show less 

*   LinkedIn© 2026
*   [About](https://about.linkedin.com/?trk=d_public_post_footer-about)
*   [Accessibility](https://www.linkedin.com/accessibility?trk=d_public_post_footer-accessibility)
*   [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=d_public_post_footer-user-agreement)
*   [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=d_public_post_footer-privacy-policy)
*   [Your California Privacy Choices](https://www.linkedin.com/legal/california-privacy-disclosure?trk=d_public_post_footer-california-privacy-rights-act)
*   [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=d_public_post_footer-cookie-policy)
*   [Copyright Policy](https://www.linkedin.com/legal/copyright-policy?trk=d_public_post_footer-copyright-policy)
*   [Brand Policy](https://brand.linkedin.com/policies?trk=d_public_post_footer-brand-policy)
*   [Guest Controls](https://www.linkedin.com/psettings/guest-controls?trk=d_public_post_footer-guest-controls)
*   [Community Guidelines](https://www.linkedin.com/legal/professional-community-policies?trk=d_public_post_footer-community-guide)
*   
    *    العربية (Arabic) 
    *    বাংলা (Bangla) 
    *    Čeština (Czech) 
    *    Dansk (Danish) 
    *    Deutsch (German) 
    *    Ελληνικά (Greek) 
    *   **English (English)**
    *    Español (Spanish) 
    *    فارسی (Persian) 
    *    Suomi (Finnish) 
    *    Français (French) 
    *    हिंदी (Hindi) 
    *    Magyar (Hungarian) 
    *    Bahasa Indonesia (Indonesian) 
    *    Italiano (Italian) 
    *    עברית (Hebrew) 
    *    日本語 (Japanese) 
    *    한국어 (Korean) 
    *    मराठी (Marathi) 
    *    Bahasa Malaysia (Malay) 
    *    Nederlands (Dutch) 
    *    Norsk (Norwegian) 
    *    ਪੰਜਾਬੀ (Punjabi) 
    *    Polski (Polish) 
    *    Português (Portuguese) 
    *    Română (Romanian) 
    *    Русский (Russian) 
    *    Svenska (Swedish) 
    *    తెలుగు (Telugu) 
    *    ภาษาไทย (Thai) 
    *    Tagalog (Tagalog) 
    *    Türkçe (Turkish) 
    *    Українська (Ukrainian) 
    *    Tiếng Việt (Vietnamese) 
    *    简体中文 (Chinese (Simplified)) 
    *    正體中文 (Chinese (Traditional)) 

 Language 

[](https://www.linkedin.com/posts/dascalescu_karpathys-llm-knowledge-base-got-18m-views-share-7447375117183115265-GyEN)

![Image 12](https://static.licdn.com/aero-v1/sc/h/5k9cgtx8rhoyqkcxfoncu1svl)
## Sign in to view more content

Create your free account or sign in to continue your search

 Email or phone  

 Password  

Show

[Forgot password?](https://www.linkedin.com/uas/request-password-reset?trk=csm-v2_forgot_password) Sign in 

Sign in with Email

or

New to LinkedIn? [Join now](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Fdascalescu_karpathys-llm-knowledge-base-got-18m-views-activity-7447375118365941761-_Szz&trk=public_post_contextual-sign-in-modal_join-link)

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).
