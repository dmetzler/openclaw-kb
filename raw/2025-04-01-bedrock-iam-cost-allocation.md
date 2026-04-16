---
title: "Bedrock IAM Cost Allocation"
source: "https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1"
date: 2025-04-01
author: "Loïc Fournier"
ingested: 2026-04-15T16:43:41.213Z
tags: [knowledge]
---

Title: #amazonbedrock #bedrock #bedrockai #awsbedrock #finops #finopsfoundation #cloudcostoptimization #cloudfinancialmanagement #costallocation #iam #generativeai #genai #aws #awscommunity #finopsforai… | Loïc Fournier

URL Source: https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1

Markdown Content:
# #amazonbedrock #bedrock #bedrockai #awsbedrock #finops #finopsfoundation #cloudcostoptimization #cloudfinancialmanagement #costallocation #iam #generativeai #genai #aws #awscommunity #finopsforai… | Loïc Fournier

Agree & Join LinkedIn

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).

[Skip to main content](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1#main-content)[LinkedIn](https://www.linkedin.com/?trk=public_post_nav-header-logo)
*   [Top Content](https://www.linkedin.com/top-content?trk=public_post_guest_nav_menu_topContent)
*   [People](https://www.linkedin.com/pub/dir/+/+?trk=public_post_guest_nav_menu_people)
*   [Learning](https://www.linkedin.com/learning/search?trk=public_post_guest_nav_menu_learning)
*   [Jobs](https://www.linkedin.com/jobs/search?trk=public_post_guest_nav_menu_jobs)
*   [Games](https://www.linkedin.com/games?trk=public_post_guest_nav_menu_games)

[Sign in](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&fromSignIn=true&trk=public_post_nav-header-signin)[Join now](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_nav-header-join)[![Image 1](https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2)](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&fromSignIn=true&trk=public_post_nav-header-signin)

# Loïc Fournier’s Post

[![Image 2: Loïc Fournier, graphic](https://media.licdn.com/dms/image/v2/D4D03AQEA_I_1eYAYqg/profile-displayphoto-scale_400_400/B4DZrvr1txIMAg-/0/1764957839005?e=2147483647&v=beta&t=cAF7JiqO6twdeKp9wejlwnjCNlQ7HP0hCX-G5WFyBu8)](https://ch.linkedin.com/in/loicfournier?trk=public_post_feed-actor-image)

[Loïc Fournier](https://ch.linkedin.com/in/loicfournier?trk=public_post_feed-actor-name)

 5d  Edited 

*   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

🤖💰Amazon Bedrock now supports native cost allocation by IAM role! Scaling GenAI workloads is exciting, until the bill arrives and you can't tell *which app* spent what. That clarity is now built right into AWS billing. 🎯 🔧 How it works: 1️⃣ Tag your IAM roles with `app`, `team`, `project`, or `environment` 2️⃣ Activate them as **cost allocation tags** in the Billing & Cost Management console 3️⃣ Create a CUR 2.0 export → enable "Include caller identity (IAM principal) allocation data" 4️⃣ Instantly analyze Bedrock inference costs per application in Cost Explorer or at line-item level in CUR 2.0 📖 Bedrock is called by applications via IAM roles (Lambda, ECS, EC2…) — so cost visibility maps directly to your services, workloads, and teams. 💡 What you unlock: 🔹 Multi-app accounts, Know exactly which microservice or AI feature is driving token costs 🔹 Env separation, Dev / Staging / Prod costs split automatically by execution role 🔹 Team chargeback, Each team's IAM role = automatic monthly attribution, zero extra setup 🔹 Pipeline vs. production, Spot if CI/CD test runs are silently burning your Bedrock budget 🔹 Budget governance, Set per-app AWS Budget alerts before overspend hits ⚙️ Available now in all AWS commercial Regions where Amazon Bedrock is supported. No custom pipelines. No profile management. Just tag your roles and go. 🔑 📖 Full documentation: 🔗 [https://lnkd.in/e2tx8k39](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fe2tx8k39&urlhash=qxVH&trk=public_post-text) 📎 what’s new: [https://lnkd.in/eWqrQRCu](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeWqrQRCu&urlhash=S2Ru&trk=public_post-text)[#AmazonBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonbedrock&trk=public_post-text)[#Bedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbedrock&trk=public_post-text)[#BedrockAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbedrockai&trk=public_post-text)[#AWSBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawsbedrock&trk=public_post-text)[#FinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinops&trk=public_post-text)[#FinOpsFoundation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinopsfoundation&trk=public_post-text)[#CloudCostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcostoptimization&trk=public_post-text)[#CloudFinancialManagement](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudfinancialmanagement&trk=public_post-text)[#CostAllocation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcostallocation&trk=public_post-text)[#IAM](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fiam&trk=public_post-text)[#GenerativeAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenerativeai&trk=public_post-text)[#GenAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenai&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#AWSCommunity](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawscommunity&trk=public_post-text)[#FinOpsForAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinopsforai&trk=public_post-text)[#AIFinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faifinops&trk=public_post-text)[#GenAIFinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenaifinops&trk=public_post-text)[#AICostManagement](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicostmanagement&trk=public_post-text)[#AICostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicostoptimization&trk=public_post-text)[#AISpend](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faispend&trk=public_post-text)[#AIBudgeting](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faibudgeting&trk=public_post-text)[#AIGovernance](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faigovernance&trk=public_post-text)[#LLMCost](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fllmcost&trk=public_post-text)[#LLMOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fllmops&trk=public_post-text)[#AIInfrastructure](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faiinfrastructure&trk=public_post-text)[#AICloudCosts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicloudcosts&trk=public_post-text)[#CloudAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudai&trk=public_post-text)[#AIEconomics](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faieconomics&trk=public_post-text)[#ResponsibleAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fresponsibleai&trk=public_post-text)[#SustainableAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsustainableai&trk=public_post-text)

*   ![Image 3: diagram, schematic](https://media.licdn.com/dms/image/v2/D4E22AQEgl_HPQkld_w/feedshare-shrink_800/B4EZ11pNarJsAc-/0/1775795230623?e=2147483647&v=beta&t=mvgbI8FU0OIMG9KhKvlhAQh6ksF66ew3sgAUf9yCR1g)

[![Image 4](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 5](https://static.licdn.com/aero-v1/sc/h/a0e8rff6djeoq8iympcysuqfu)![Image 6](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v) 197](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_social-actions-reactions)[8 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment-cta)

 Share 
*   Copy
*   LinkedIn
*   Facebook
*   X

[![Image 7: Loïc Fournier, graphic](https://media.licdn.com/dms/image/v2/D4D03AQEA_I_1eYAYqg/profile-displayphoto-scale_400_400/B4DZrvr1txIMAg-/0/1764957839005?e=2147483647&v=beta&t=cAF7JiqO6twdeKp9wejlwnjCNlQ7HP0hCX-G5WFyBu8)](https://ch.linkedin.com/in/loicfournier?trk=public_post_comment_actor-image)

[Loïc Fournier](https://ch.linkedin.com/in/loicfournier?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

As Bedrock adoption grows, cost attribution becomes a governance gap fast. One SCP to close it — deny inference calls from any IAM principal missing a cost-center tag: json { "Version": "2012-10-17", "Statement": [{ "Sid": "DenyBedrockIfMissingCostTag", "Effect": "Deny", "Action": [ "bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream" ], "Resource": "*", "Condition": { "Null": { "aws:PrincipalTag/cost-center": "true" } } }] } Attach at OU level. No tag, no Bedrock call. Combined with the new line_item_iam_principal column in CUR 2.0, every inference request is now traceable to a team and a cost center — enforcement and attribution in a single control.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reactions) 2 Reactions 

[![Image 8: Stephen McCulloch CISSP, graphic](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://uk.linkedin.com/in/stephen-mcculloch?trk=public_post_comment_actor-image)

[Stephen McCulloch CISSP](https://uk.linkedin.com/in/stephen-mcculloch?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Awesome!!!

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply) 1 Reaction 

[![Image 9: Alex Luch, graphic](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://ge.linkedin.com/in/alexluch?trk=public_post_comment_actor-image)

[Alex Luch](https://ge.linkedin.com/in/alexluch?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

A great feature for Enterprise Bedrock cost management!

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reactions) 2 Reactions 

[![Image 10: Rayco Martinez Hernandez, graphic](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://es.linkedin.com/in/rayco-mh?trk=public_post_comment_actor-image)

[Rayco Martinez Hernandez](https://es.linkedin.com/in/rayco-mh?trk=public_post_comment_actor-name) 4d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Good step forward for Amazon Bedrock cost visibility, but like many others, it still lacks an enterprise-wide view. This is role-level attribution, not true “who did what” especially in federated setups with AWS IAM Identity Center, where architectures are often complex and involve many other components that also need to be accounted for. Real progress will come from pushing attribution left (user, feature, request level), not just IAM roles. And it would be great to see this level of detail aligned beyond AWS Cost and Usage Report into open standards like FOCUS. Good move not the finish line.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply) 1 Reaction 

[![Image 11: Madhu Kumar, graphic](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/in/madhu-kumar-7467a5?trk=public_post_comment_actor-image)

[Madhu Kumar](https://www.linkedin.com/in/madhu-kumar-7467a5?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[Sushma Dhas](https://in.linkedin.com/in/sushma-dhas-686155238?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply) 1 Reaction 

[![Image 12: André Nickel, graphic](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://br.linkedin.com/in/andre-nickel?trk=public_post_comment_actor-image)

[André Nickel](https://br.linkedin.com/in/andre-nickel?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[Yago Battaggia](https://br.linkedin.com/in/yago-battaggia-01035a148/en?trk=public_post_comment-text)[Mateus Attie](https://br.linkedin.com/in/mateus-attie-a41522119?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_comment_reactions) 2 Reactions 

[See more comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_see-more-comments)
To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_feed-cta-banner-cta)

## More Relevant Posts

*   
[](https://www.linkedin.com/posts/yarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz)

[![Image 13: View profile for Yariv Haelyon](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://il.linkedin.com/in/yarivhaelyon?trk=public_post_feed-actor-image)[Yariv Haelyon](https://il.linkedin.com/in/yarivhaelyon?trk=public_post_feed-actor-name)  4d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fyarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

🤖💰 Big news for GenAI cost visibility — Amazon Bedrock now supports native cost allocation by IAM role! No more mystery bills. Simply tag your IAM roles and instantly see which app, team, or environment is driving your Bedrock inference costs — all built directly into AWS billing. Zero custom pipelines needed. 📖 Read the full details here 👇 🔗 [https://lnkd.in/e2tx8k39](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fe2tx8k39&urlhash=qxVH&trk=public_post-text) 📎 What’s new: [https://lnkd.in/eWqrQRCu](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeWqrQRCu&urlhash=S2Ru&trk=public_post-text)[#AmazonBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonbedrock&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#FinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinops&trk=public_post-text)[#GenAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenai&trk=public_post-text)[#CloudCostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcostoptimization&trk=public_post-text)[#CostAllocation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcostallocation&trk=public_post-text)[#IAM](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fiam&trk=public_post-text)[#AICostManagement](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicostmanagement&trk=public_post-text)

[![Image 14: View profile for Loïc Fournier](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://ch.linkedin.com/in/loicfournier?trk=public_post_reshare_feed-actor-image)

[Loïc Fournier](https://ch.linkedin.com/in/loicfournier?trk=public_post_reshare_feed-actor-name)

Senior Technical Account Manager AWS & FINOPs Governance Enabler.

 5d  Edited 

🤖💰Amazon Bedrock now supports native cost allocation by IAM role! Scaling GenAI workloads is exciting, until the bill arrives and you can't tell *which app* spent what. That clarity is now built right into AWS billing. 🎯 🔧 How it works: 1️⃣ Tag your IAM roles with `app`, `team`, `project`, or `environment` 2️⃣ Activate them as **cost allocation tags** in the Billing & Cost Management console 3️⃣ Create a CUR 2.0 export → enable "Include caller identity (IAM principal) allocation data" 4️⃣ Instantly analyze Bedrock inference costs per application in Cost Explorer or at line-item level in CUR 2.0 📖 Bedrock is called by applications via IAM roles (Lambda, ECS, EC2…) — so cost visibility maps directly to your services, workloads, and teams. 💡 What you unlock: 🔹 Multi-app accounts, Know exactly which microservice or AI feature is driving token costs 🔹 Env separation, Dev / Staging / Prod costs split automatically by execution role 🔹 Team chargeback, Each team's IAM role = automatic monthly attribution, zero extra setup 🔹 Pipeline vs. production, Spot if CI/CD test runs are silently burning your Bedrock budget 🔹 Budget governance, Set per-app AWS Budget alerts before overspend hits ⚙️ Available now in all AWS commercial Regions where Amazon Bedrock is supported. No custom pipelines. No profile management. Just tag your roles and go. 🔑 📖 Full documentation: 🔗 [https://lnkd.in/e2tx8k39](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fe2tx8k39&urlhash=qxVH&trk=public_post_reshare-text) 📎 what’s new: [https://lnkd.in/eWqrQRCu](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeWqrQRCu&urlhash=S2Ru&trk=public_post_reshare-text)[#AmazonBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonbedrock&trk=public_post_reshare-text)[#Bedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbedrock&trk=public_post_reshare-text)[#BedrockAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbedrockai&trk=public_post_reshare-text)[#AWSBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawsbedrock&trk=public_post_reshare-text)[#FinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinops&trk=public_post_reshare-text)[#FinOpsFoundation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinopsfoundation&trk=public_post_reshare-text)[#CloudCostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcostoptimization&trk=public_post_reshare-text)[#CloudFinancialManagement](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudfinancialmanagement&trk=public_post_reshare-text)[#CostAllocation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcostallocation&trk=public_post_reshare-text)[#IAM](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fiam&trk=public_post_reshare-text)[#GenerativeAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenerativeai&trk=public_post_reshare-text)[#GenAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenai&trk=public_post_reshare-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post_reshare-text)[#AWSCommunity](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawscommunity&trk=public_post_reshare-text)[#FinOpsForAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinopsforai&trk=public_post_reshare-text)[#AIFinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faifinops&trk=public_post_reshare-text)[#GenAIFinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenaifinops&trk=public_post_reshare-text)[#AICostManagement](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicostmanagement&trk=public_post_reshare-text)[#AICostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicostoptimization&trk=public_post_reshare-text)[#AISpend](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faispend&trk=public_post_reshare-text)[#AIBudgeting](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faibudgeting&trk=public_post_reshare-text)[#AIGovernance](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faigovernance&trk=public_post_reshare-text)[#LLMCost](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fllmcost&trk=public_post_reshare-text)[#LLMOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fllmops&trk=public_post_reshare-text)[#AIInfrastructure](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faiinfrastructure&trk=public_post_reshare-text)[#AICloudCosts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faicloudcosts&trk=public_post_reshare-text)[#CloudAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudai&trk=public_post_reshare-text)[#AIEconomics](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faieconomics&trk=public_post_reshare-text)[#ResponsibleAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fresponsibleai&trk=public_post_reshare-text)[#SustainableAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsustainableai&trk=public_post_reshare-text)

    *   ![Image 15: No alternative text description for this image](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)

[![Image 16](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 5](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fyarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fyarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fyarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fyarivhaelyon_amazonbedrock-aws-finops-activity-7448625279574564864-r1Kz&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/shravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang)

[![Image 17: View profile for Shravanth Venkatesh](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/in/shravanth-v?trk=public_post_feed-actor-image)[Shravanth Venkatesh](https://www.linkedin.com/in/shravanth-v?trk=public_post_feed-actor-name)  1mo  Edited    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

🚀 AWS just dropped some game-changing updates, and if you're not paying attention, you're already falling behind. 1. Amazon Bedrock now supports cross-region inference, meaning your AI workloads can automatically route to the best available region for lower latency and higher resilience, a massive win for enterprise-scale GenAI deployments. (🔗[https://lnkd.in/gpJsN_sd](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FgpJsN_sd&urlhash=5pG0&trk=public_post-text)) 2. Amazon Q Developer has expanded its capabilities with autonomous code review and vulnerability scanning, helping dev teams ship faster and more securely without leaving their IDE. (🔗[https://lnkd.in/gdYgUA6m](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FgdYgUA6m&urlhash=8aG7&trk=public_post-text)) 3. AWS also announced Amazon S3 Metadata, a fully managed feature that makes querying object metadata at scale dramatically simpler, no more custom workarounds for large data lake architectures. (🔗[https://aws.amazon.com/s3/](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Faws%2Eamazon%2Ecom%2Fs3%2F&urlhash=O_Uy&trk=public_post-text)) The pace of innovation from AWS right now is relentless, and the teams that learn to operationalize these tools quickly will have a serious competitive edge in 2025. Which of these updates excites you the most or is there an AWS announcement I should be covering that's flying under the radar? Drop it in the comments 👇 [#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#CloudComputing](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcomputing&trk=public_post-text)[#AmazonBedrock](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonbedrock&trk=public_post-text)[#AmazonQ](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonq&trk=public_post-text)[#GenerativeAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenerativeai&trk=public_post-text)[#CloudInnovation](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudinnovation&trk=public_post-text)[#DevOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevops&trk=public_post-text)[#AWSNews](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawsnews&trk=public_post-text)

    *   ![Image 18: No alternative text description for this image](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)

[![Image 19](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 20](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 21](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 47](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_social-actions-reactions)[20 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshravanth-v_aws-cloudcomputing-amazonbedrock-activity-7439106872697143296-Eang&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/andyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1)

[![Image 22: View profile for Andy Hopla](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://uk.linkedin.com/in/andyhopla?trk=public_post_feed-actor-image)[Andy Hopla](https://uk.linkedin.com/in/andyhopla?trk=public_post_feed-actor-name)  5d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Perhaps somewhat of a refelctive piece—largely from Andy Jassy—on how both careers and companies like Amazon and Amazon Web Services evolve in non-linear ways. It argues that success rarely follows a straight path, highlighting how AWS and Amazon grew through experimentation, failures, and continuous reinvention. The piece emphasises key lessons: invest heavily in major shifts like AI, pursue multiple strategies in parallel, be willing to rebuild systems from scratch, and maintain a culture that embraces uncertainty and rapid change. Overall, it presents a forward-looking view that AI, robotics, and cloud will drive the next wave of transformation, and that companies willing to take bold, long-term bets and adapt quickly will be best positioned to succeed. [https://lnkd.in/ekNPGJct](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FekNPGJct&urlhash=16Ky&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#Cloud](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloud&trk=public_post-text)[#Devops](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevops&trk=public_post-text)[#SoleymanShahir](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsoleymanshahir&trk=public_post-text)[#CloudCostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcostoptimization&trk=public_post-text)[#FinOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Ffinops&trk=public_post-text)[#CloudArchitecture](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudarchitecture&trk=public_post-text)[#CloudInfrastructure](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudinfrastructure&trk=public_post-text)[#CostOptimization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcostoptimization&trk=public_post-text)[#CloudEngineering](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudengineering&trk=public_post-text)[#SRE](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsre&trk=public_post-text)[#ITLeadership](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fitleadership&trk=public_post-text)[#OperationalExcellence](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Foperationalexcellence&trk=public_post-text)

[![Image 23: CEO Andy Jassy’s 2025 Letter to Shareholders](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) CEO Andy Jassy’s 2025 Letter to Shareholders aboutamazon.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Eaboutamazon%2Ecom%2Fnews%2Fcompany-news%2Famazon-ceo-andy-jassy-2025-letter-to-shareholders&urlhash=y8OO&trk=public_post_feed-article-content)

[![Image 24](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 25](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 2](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandyhopla_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448294613527900160-jqt1&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/akhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI)

[![Image 26: View profile for Akhil Diddi](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://in.linkedin.com/in/akhil-diddi?trk=public_post_feed-actor-image)[Akhil Diddi](https://in.linkedin.com/in/akhil-diddi?trk=public_post_feed-actor-name)  1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fakhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

A few weeks ago, I was working on a system that had to handle millions of file uploads — images, logs, and data coming in continuously. At first, everything looked fine… Until suddenly ⚠️ The system started slowing down. APIs were timing out. Processing jobs were failing. Why? Because everything was happening at once. Every file upload immediately triggered processing — and when thousands (or millions) came in together, the system simply couldn’t keep up. That’s when I came across Amazon SQS (Simple Queue Service) — and it completely changed the approach. Instead of processing files instantly, we did something simple: 👉 When a file is uploaded → send a message to SQS 👉 Let background workers pick up messages one by one 👉 Process files asynchronously And just like that… ✨ No more system crashes ✨ No more overload ✨ Smooth and scalable processing The biggest lesson I learned: 💡 You don’t have to do everything immediately — you just have to do it reliably. Amazon SQS helped turn a stressed system into a calm, scalable pipeline that can handle millions of files without breaking. Sometimes, the best solution isn’t “faster”… It’s smarter architecture. [#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#SQS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsqs&trk=public_post-text)[#CloudComputing](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcomputing&trk=public_post-text)[#SystemDesign](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsystemdesign&trk=public_post-text)[#Scalability](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fscalability&trk=public_post-text)[#Learning](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Flearning&trk=public_post-text)[#DataEngineering](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdataengineering&trk=public_post-text)

    *   ![Image 27: No alternative text description for this image](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)View C2PA information ![Image 28](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)

[![Image 29](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 4](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fakhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fakhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fakhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fakhil-diddi_aws-sqs-cloudcomputing-activity-7445487572333608961-M8rI&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/bizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO)

[![Image 30: View organization page for BizCloud Experts](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/company/bizcloudexperts-bce?trk=public_post_feed-actor-image)[BizCloud Experts](https://www.linkedin.com/company/bizcloudexperts-bce?trk=public_post_feed-actor-name) 
2,247 followers

 3w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fbizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Property management systems are notoriously rigid. We helped @RealManage revamp their legacy systems using serverless microservices and Amazon Q Developer, enabling faster releases and lower maintenance costs. RealManage broke the cycle of rigid architecture by partnering with [#BizCloudExperts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbizcloudexperts&trk=public_post-text) to implement Amazon Q Developer. By leveraging GenAI, they achieved: ✅ Automated Documentation – No more "black box" legacy code. ✅ Serverless Modernization – A shift to sleek, scalable AWS Lambda microservices. ✅ Instant Troubleshooting – Drastically reduced MTTR with AI-driven insights. Modernize your real estate tech stack. Read the case study: [https://lnkd.in/gh4v9QSz](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fgh4v9QSz&urlhash=na3s&trk=public_post-text) 📞 Call us: (214) 206-8976 📧 Email: [bizdev@bizcloudexperts.com](https://www.linkedin.com/redir/redirect?url=mailto%3Abizdev%40bizcloudexperts%2Ecom&urlhash=wAKG&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#GenerativeAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenerativeai&trk=public_post-text)[#AmazonQ](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazonq&trk=public_post-text)[#awscommunity](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawscommunity&trk=public_post-text)[#CloudModernization](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudmodernization&trk=public_post-text)[#DevOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevops&trk=public_post-text)[#BizCloudExperts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fbizcloudexperts&trk=public_post-text)[#awsmarketplace](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fawsmarketplace&trk=public_post-text)

 …more 

Play Video

Video Player is loading.

Loaded: 0%

Play Back to start

Stream Type LIVE

Current Time 0:00

/

Duration 0:00

1x

Playback Rate

Show Captions

Mute

Fullscreen

[![Image 31](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 10](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fbizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fbizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fbizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fbizcloudexperts-bce_bizcloudexperts-aws-generativeai-activity-7440744250100789250-B3mO&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/jpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9)

[![Image 32: View profile for Juan Pablo Garcia Gonzalez](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/in/jpgarciagonzalez?trk=public_post_feed-actor-image)[Juan Pablo Garcia Gonzalez](https://www.linkedin.com/in/jpgarciagonzalez?trk=public_post_feed-actor-name)  5d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fjpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

AWS just launched the Agent Registry (preview) as part of Amazon Bedrock AgentCore—a centralized hub to discover, share, and reuse AI agents, tools, and agent skills across your organization . It enables centralized governance, eliminates siloed development, and reduces duplicated effort, helping teams move from prototype to production-ready multi-agent systems faster. [https://lnkd.in/eWtuka4E](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeWtuka4E&urlhash=TqFP&trk=public_post-text)

[![Image 33: The future of managing agents at scale: AWS Agent Registry now in preview | Amazon Web Services](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) The future of managing agents at scale: AWS Agent Registry now in preview | Amazon Web Services aws.amazon.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Faws%2Eamazon%2Ecom%2Fblogs%2Fmachine-learning%2Fthe-future-of-managing-agents-at-scale-aws-agent-registry-now-in-preview%2F&urlhash=CCPB&trk=public_post_feed-article-content)

[![Image 34](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 11](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fjpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fjpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fjpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fjpgarciagonzalez_the-future-of-managing-agents-at-scale-aws-activity-7448380633749295104-Ehm9&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/imaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j)

[![Image 35: View profile for Imaya Kumar Jagannathan](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/in/imaya?trk=public_post_feed-actor-image)[Imaya Kumar Jagannathan](https://www.linkedin.com/in/imaya?trk=public_post_feed-actor-name)  4d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Amazon CloudWatch Pipelines just got a lot smarter. You can now define conditions that control when a processor runs and which log entries it acts on. No more applying transformations uniformly across all your data — you pick what gets processed and what doesn't. This works across 21 processors including Add Entries, Delete Entries, Copy Values, Grok, and Rename Key. There's also a new Drop Events processor that lets you filter out unwanted log entries from third-party connectors before they hit CloudWatch. Less noise, lower costs. Both features are available at no additional cost in all Regions where CloudWatch Pipelines is GA. If you're building log pipelines on AWS, this is a meaningful step toward the kind of fine-grained control you'd expect from a mature ingestion layer. [https://lnkd.in/eHR2htjy](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeHR2htjy&urlhash=kLwU&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#CloudWatch](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudwatch&trk=public_post-text)[#Observability](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fobservability&trk=public_post-text)[#CloudComputing](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcomputing&trk=public_post-text)[#DevOps](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevops&trk=public_post-text)

[![Image 36: Amazon CloudWatch pipelines now supports drop and conditional processing - AWS](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) Amazon CloudWatch pipelines now supports drop and conditional processing - AWS aws.amazon.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Faws%2Eamazon%2Ecom%2Fabout-aws%2Fwhats-new%2F2026%2F04%2Famazon-cloudwatch-pipelines-conditional%2F&urlhash=Gy9u&trk=public_post_feed-article-content)

[![Image 37](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 38](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 39](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 47](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_social-actions-reactions)[1 Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fimaya_amazon-cloudwatch-pipelines-now-supports-activity-7448502659055054848-tR9j&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/andr%C3%A9s-g%C3%B3mez-rodr%C3%ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir)

[![Image 40: View profile for Andrés Gómez Rodríguez](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://es.linkedin.com/in/andr%C3%A9s-g%C3%B3mez-rodr%C3%ADguez-2a7a68225?trk=public_post_feed-actor-image)[Andrés Gómez Rodríguez](https://es.linkedin.com/in/andr%C3%A9s-g%C3%B3mez-rodr%C3%ADguez-2a7a68225?trk=public_post_feed-actor-name)  3w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

A few weeks ago, a customer told me: "I didn't know AWS offered all of this." They'd been running workloads on AWS for years. Paying their bill every month. Never really engaging with us beyond that. When we finally sat down, we mapped out their architecture together, found some quick wins on cost, and they mentioned they'd been curious about AI but had no idea where to start. So we connected them with one of our GenAI specialists, set up a Proof of Concept using Amazon Bedrock with AWS Credits, and within a few weeks they had a working prototype. It's now heading to production. What surprised them most was that the security review, the sessions with our Solutions Architects, the POC credits... all of it was already available to them through their account team. They just didn't know. I work with companies across the UK and Ireland, and I hear this more often than you'd think. If you're running on AWS and haven't had a proper conversation with your account team in a while, this is your sign. Whether it's AI, security, cost optimisation, or just a general health check, I'm here for it. And if you're reading this and we're already connected but haven't spoken yet, I'd genuinely love to meet you. No agenda, just a quick intro. Drop me a message, comment below, or grab a slot directly — link in the first comment☕😉 [#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)[#CloudComputing](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fcloudcomputing&trk=public_post-text)[#GenAI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fgenai&trk=public_post-text)[#SmbUKI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fsmbuki&trk=public_post-text)

[![Image 41](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 14](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_social-actions-reactions)[1 Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fandr%25C3%25A9s-g%25C3%25B3mez-rodr%25C3%25ADguez-2a7a68225_aws-cloudcomputing-genai-activity-7440407332875878400-VIir&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/louise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz)

[![Image 42: View profile for Louise Allen](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://ie.linkedin.com/in/louise-allen-7325426b?trk=public_post_feed-actor-image)[Louise Allen](https://ie.linkedin.com/in/louise-allen-7325426b?trk=public_post_feed-actor-name)  1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Flouise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

This is so much more than just a new feature. It’s a huge upgrade for our customers 🚀✨☁️ Amazon CloudWatch now natively ingests OpenTelemetry metrics and supports PromQL queries. Read the full blog post: [https://lnkd.in/dBiuTYRK](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FdBiuTYRK&urlhash=yCUg&trk=public_post-text)

[![Image 43: Introducing OpenTelemetry & PromQL support in Amazon CloudWatch | Amazon Web Services](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) Introducing OpenTelemetry & PromQL support in Amazon CloudWatch | Amazon Web Services aws.amazon.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Faws%2Eamazon%2Ecom%2Fblogs%2Fmt%2Fintroducing-opentelemetry-promql-support-in-amazon-cloudwatch%2F&urlhash=pqCJ&trk=public_post_feed-article-content)

[![Image 44](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 45](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 46](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 5](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Flouise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Flouise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Flouise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Flouise-allen-7325426b_introducing-opentelemetry-promql-support-activity-7446107854157025280-c6Zz&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/shahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf)

[![Image 47: View profile for Kamran Shah](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)](https://www.linkedin.com/in/shahjees?trk=public_post_feed-actor-image)[Kamran Shah](https://www.linkedin.com/in/shahjees?trk=public_post_feed-actor-name)  5d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

🚨 Amazon CEO Andy Jassy just dropped his 2025 Letter to Shareholders: "When you identify disproportionate inflections, bet big." One of these seminal shifts is AI. "Every customer experience will be reinvented by AI, and there will be a slew of new experiences only possible because of AI. AI is a once-in-a-lifetime opportunity where the current growth is unprecedented and the future growth even bigger." Jassy dismisses AI bubble fears: "I’ve followed the public debate on whether this technology is over-hyped, whether we’re in ‘a bubble,’ and if the margins and ROIC will be appealing. My strong conviction, at least for Amazon, is that the answers are no, no, and yes." Amazon is going all-in: Not conservative — "we’re investing to be the meaningful leader, and our future business, operating income, and FCF will be much larger because of it." They're pouring ~$200 billion in capex in 2026 (mostly AI infrastructure), backed by strong customer commitments — "not on a hunch." FCF took a hit last year ($38B → $11B) due to AI spend, but revenue grew 12% to $717B. AWS is in the middle of the AI "land rush" — AI services already at a $15B annual run rate (as of Q1). Custom chips (Trainium/Graviton) are booming at ~$20B run rate, changing AWS economics and "will be much larger than most think." Demand is so high that Amazon may even sell racks of its AI chips to third parties in the future. Jassy: "We’re not going to be conservative in how we play this." Full letter: [https://lnkd.in/gi7A2VZT](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fgi7A2VZT&urlhash=YDa4&trk=public_post-text) What do you think — is Amazon's massive AI bet a masterstroke or risky? [#Amazon](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Famazon&trk=public_post-text)[#AI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fai&trk=public_post-text)[#AWS](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Faws&trk=public_post-text)

[![Image 48: CEO Andy Jassy’s 2025 Letter to Shareholders](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) CEO Andy Jassy’s 2025 Letter to Shareholders aboutamazon.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Eaboutamazon%2Ecom%2Fnews%2Fcompany-news%2Famazon-ceo-andy-jassy-2025-letter-to-shareholders&urlhash=y8OO&trk=public_post_feed-article-content)

[![Image 49](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)![Image 50](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1) 7](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fshahjees_ceo-andy-jassys-2025-letter-to-shareholders-activity-7448217459213529088-Vjuf&trk=public_post_feed-cta-banner-cta)

![Image 51](https://media.licdn.com/dms/image/v2/D4D16AQGKOziNqE0mpQ/profile-displaybackgroundimage-shrink_200_800/profile-displaybackgroundimage-shrink_200_800/0/1722618739210?e=2147483647&v=beta&t=DrPwBwXhxr8_1IU9n2q-ReEoUu5CuHgaPJqzvBTOtgM)

![Image 52: Loïc Fournier](https://media.licdn.com/dms/image/v2/D4D03AQEA_I_1eYAYqg/profile-displayphoto-scale_200_200/B4DZrvr1txIMAY-/0/1764957839005?e=2147483647&v=beta&t=7f-z7-fxCwidlzuQVP6PtskFpHgKk7XVehM17YesWaU)
3,689 followers

*   [501 Posts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fin%2Floicfournier%2Frecent-activity%2F&trk=public_post_follow-posts)

[View Profile](https://ch.linkedin.com/in/loicfournier?trk=public_post_follow-view-profile)[Connect](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Ffeed%2Fupdate%2Furn%3Ali%3Aactivity%3A7448225042020306944&trk=public_post_follow)

## Explore related topics

*   [How to Set AWS Budget Alerts for Teams](https://www.linkedin.com/top-content/project-management/budget-monitoring-in-projects/how-to-set-aws-budget-alerts-for-teams/)
*   [Amazon Bedrock for AI Professionals and Developers](https://www.linkedin.com/top-content/artificial-intelligence/ai-frameworks-for-software-development/amazon-bedrock-for-ai-professionals-and-developers/)
*   [How to Apply Amazon Bedrock Agents in R&D](https://www.linkedin.com/top-content/artificial-intelligence/developing-ai-agents/how-to-apply-amazon-bedrock-agents-in-r-d/)
*   [FinOps Automation for Cloud Cost Management](https://www.linkedin.com/top-content/supply-chain-management/cloud-cost-management/finops-automation-for-cloud-cost-management/)
*   [AWS Cost Optimization Strategies for Technical Teams](https://www.linkedin.com/top-content/supply-chain-management/cloud-cost-management/aws-cost-optimization-strategies-for-technical-teams/)
*   [AWS Bedrock for Improving AI Content Accuracy](https://www.linkedin.com/top-content/artificial-intelligence/data-quality-for-ai/aws-bedrock-for-improving-ai-content-accuracy/)
*   [Applying Amazon Bedrock to System Analysis](https://www.linkedin.com/top-content/engineering/software-engineering-cloud-computing/applying-amazon-bedrock-to-system-analysis/)
*   [AWS Budget Management Strategies for CTOs](https://www.linkedin.com/top-content/supply-chain-management/cloud-cost-management/aws-budget-management-strategies-for-ctos/)
*   [AWS Cost Management Strategies for Product Managers](https://www.linkedin.com/top-content/supply-chain-management/cloud-cost-management/aws-cost-management-strategies-for-product-managers/)
*   [Monitor Cost Variations in AWS](https://www.linkedin.com/top-content/supply-chain-management/cloud-cost-management/monitor-cost-variations-in-aws/)

 Show more  Show less 

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

[](https://www.linkedin.com/posts/loicfournier_amazonbedrock-bedrock-bedrockai-share-7448225040850096130-5CA1)

![Image 53](https://static.licdn.com/aero-v1/sc/h/5k9cgtx8rhoyqkcxfoncu1svl)
## Join now to view more content

Create your free account or sign in to continue your search

 Email or phone  

 Password  

Show

[Forgot password?](https://www.linkedin.com/uas/request-password-reset?trk=csm-v2_forgot_password) Sign in 

[Join with email](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Floicfournier_amazonbedrock-bedrock-bedrockai-activity-7448225042020306944-PlUg&trk=public_post_contextual-sign-in-modal_join-with-email-cta)

or

Already on LinkedIn? [Sign in](https://www.linkedin.com/login?trk=public_post_contextual-sign-in-modal_sign-in-link)

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).
