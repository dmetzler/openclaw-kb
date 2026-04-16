---
title: "Karpathy LLM Wiki Pattern"
source: "https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe"
date: 2025-04-01
author: "Rohit Ghumare"
ingested: 2026-04-15T16:43:56.873Z
tags: [knowledge]
---

Title: Karpathy just published his "LLM Wiki" pattern and hit 5K stars overnight. Using LLMs to build and maintain personal knowledge bases instead of re-deriving everything through RAG on every query. The… | Rohit Ghumare | 12 comments

URL Source: https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe

Markdown Content:
# Karpathy just published his "LLM Wiki" pattern and hit 5K stars overnight. Using LLMs to build and maintain personal knowledge bases instead of re-deriving everything through RAG on every query. The… | Rohit Ghumare | 12 comments

Agree & Join LinkedIn

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).

[Skip to main content](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe#main-content)[LinkedIn](https://www.linkedin.com/?trk=public_post_nav-header-logo)
*   [Top Content](https://www.linkedin.com/top-content?trk=public_post_guest_nav_menu_topContent)
*   [People](https://www.linkedin.com/pub/dir/+/+?trk=public_post_guest_nav_menu_people)
*   [Learning](https://www.linkedin.com/learning/search?trk=public_post_guest_nav_menu_learning)
*   [Jobs](https://www.linkedin.com/jobs/search?trk=public_post_guest_nav_menu_jobs)
*   [Games](https://www.linkedin.com/games?trk=public_post_guest_nav_menu_games)

[Sign in](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&fromSignIn=true&trk=public_post_nav-header-signin)[Join now](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_nav-header-join)[![Image 1](https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2)](https://www.linkedin.com/login?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&fromSignIn=true&trk=public_post_nav-header-signin)

# Rohit Ghumare’s Post

[![Image 2: Rohit Ghumare, graphic](https://media.licdn.com/dms/image/v2/D5603AQECN5nRIGZqkA/profile-displayphoto-scale_400_400/B56Zyir4oWIYAg-/0/1772255941077?e=2147483647&v=beta&t=tbYoXgT2pDK060mU3Iqt-YTl1BVZdZuIoeiSsJzz0RI)](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_feed-actor-image)

[Rohit Ghumare](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_feed-actor-name)

 1w 

*   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Karpathy just published his "LLM Wiki" pattern and hit 5K stars overnight. Using LLMs to build and maintain personal knowledge bases instead of re-deriving everything through RAG on every query. The core idea: stop retrieving, start compiling. The LLM incrementally builds a structured wiki from your sources. Cross-references maintained. Contradictions flagged. Knowledge compounds with every source you add. I built this 6 months ago with agentmemory. Same pattern, but agent-facing and fully automated. After running it in production across thousands of sessions, here's what's missing from the original: 1. Memory lifecycle. Not all facts are equally valid forever. You need confidence scoring, supersession, and a forgetting curve. Architecture decisions decay slowly. Transient bugs decay fast. 2. Knowledge graph. Flat pages with wikilinks leave structure on the table. Typed entities and relationships let you traverse "what depends on Redis?" instead of keyword-searching for it. 3. Hybrid search. [index.md](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2Findex%2Emd&urlhash=0kko&trk=public_post-text) breaks around 100 pages. You need BM25 + vector + graph traversal fused together. 4. Automation. The original is entirely manual. In practice you want hooks: auto-ingest on new sources, auto-lint on schedule, context injection on session start. The bookkeeping should be zero-effort. 5. Multi-agent. Single user, single agent doesn't hold. You need mesh sync, shared vs private scoping, and lightweight work coordination. 6. Quality controls. Without scoring and self-healing, the wiki accumulates noise. Score everything. Auto-fix orphans and stale claims. I forked Karpathy's gist and published a v2 with all of these additions. GitHub Gist: [https://lnkd.in/epc_gGqd](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fepc_gGqd&urlhash=0MQE&trk=public_post-text) Engine: [https://lnkd.in/e5syVfaA](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fe5syVfaA&urlhash=ZUNw&trk=public_post-text) The bottleneck was never reading or thinking. It was bookkeeping. LLMs solve that.

*   ![Image 3: No alternative text description for this image](https://media.licdn.com/dms/image/v2/D4E22AQGxAXIZTFB4sg/feedshare-shrink_800/B4EZ1ioYL2IsAc-/0/1775476245626?e=2147483647&v=beta&t=4Pxni5a6MAHn6169sAdCW49bkDTcnmmeXFHb5Eekaq8)

[![Image 4](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 5](https://static.licdn.com/aero-v1/sc/h/a0e8rff6djeoq8iympcysuqfu)![Image 6](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v) 323](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_social-actions-reactions)[12 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment-cta)

 Share 
*   Copy
*   LinkedIn
*   Facebook
*   X

[![Image 7: Rohit Ghumare, graphic](https://media.licdn.com/dms/image/v2/D5603AQECN5nRIGZqkA/profile-displayphoto-scale_400_400/B56Zyir4oWIYAg-/0/1772255941077?e=2147483647&v=beta&t=tbYoXgT2pDK060mU3Iqt-YTl1BVZdZuIoeiSsJzz0RI)](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_comment_actor-image)

[Rohit Ghumare](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[github.com/rohitg00/agentmemory](http://github.com/rohitg00/agentmemory?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reactions) 2 Reactions 

[![Image 8: Rohit Ghumare, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_comment_actor-image)

[Rohit Ghumare](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Interact with artifact: [https://claude.ai/public/artifacts/bd55c656-de32-414e-ba8f-81454c66bd62](https://claude.ai/public/artifacts/bd55c656-de32-414e-ba8f-81454c66bd62?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reactions) 2 Reactions 

[![Image 9: Hung Cheung Chan, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://au.linkedin.com/in/hung-cheung-chan?trk=public_post_comment_actor-image)

[Hung Cheung Chan](https://au.linkedin.com/in/hung-cheung-chan?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Open AI help me implemented a large framework/susbtrate that indeed contain the idea of LLM wiki as a small part of my work.I think openAI secretly let me design and open source the same idea in my repo and let Karpathy spread the idea of the patternSee my openAI chatgpt codex led implementation and its whole family of open source work here:LLM-wiki is a subset of my work below[https://github.com/humblemat810/kogwistar](https://github.com/humblemat810/kogwistar?trk=public_post_comment-text) a substrate that easily enables -> hypergraph rag + execution + ingestion examples[https://github.com/humblemat810/kogwistar-chat](https://github.com/humblemat810/kogwistar-chat?trk=public_post_comment-text) -> example application that show the above is really a core substrate[https://github.com/humblemat810/cloistar](https://github.com/humblemat810/cloistar?trk=public_post_comment-text) -> my another toy repo that show my substrate can implement strict openclaw governanceIf I implemented and opensourced it much earlier... I think my research and innovation mind is still not rusty

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reactions) 2 Reactions 

[![Image 10: Madhav Kapila, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://in.linkedin.com/in/madhav-kapila?trk=public_post_comment_actor-image)

[Madhav Kapila](https://in.linkedin.com/in/madhav-kapila?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

The major question with LLM based knowledge bases is: If we add an LLM layer doesn't it make it resource heavy, either we have to run it on our machine using Open Source LLMs making it compute heavy or we have to use API keys making it cost heavy. The current RAG knowledge bases on the other hand are made without any context and are so resource efficient. Also thinking about another problem how will LLM handle the large context windows to make very big knowledge bases? Or am I missing something, may you please clarify?

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reactions) 2 Reactions 

[![Image 11: John Inniger, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://www.linkedin.com/in/john-inniger?trk=public_post_comment_actor-image)

[John Inniger](https://www.linkedin.com/in/john-inniger?trk=public_post_comment_actor-name) 5d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[Rohit Ghumare](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_comment-text) I took a very similar line for my Core Memory, but instead using a Beads-like small schema instead of full markdown files. I’m focused on preserving causality instead of just fact retention via summary with semantic search. [https://github.com/JohnnyFiv3r/Core-Memory.git](https://github.com/JohnnyFiv3r/Core-Memory.git?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply) 1 Reaction 

[![Image 12: Antonio Blago, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://de.linkedin.com/in/antonioblago?trk=public_post_comment_actor-image)

[Antonio Blago](https://de.linkedin.com/in/antonioblago?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

skillmind is an Active Skill Listener & Trainer — structured memory layer for AI coding assistants. 5 vector DB backends, 14 MCP tools, YouTube/video learning, auto-sanitizer. [https://share.google/fu52ZVsTrnarskAII](https://share.google/fu52ZVsTrnarskAII?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply) 1 Reaction 

[![Image 13: Mehmet Gökçe, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://ch.linkedin.com/in/mehmetgoekce?trk=public_post_comment_actor-image)

[Mehmet Gökçe](https://ch.linkedin.com/in/mehmetgoekce?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Interesting timing - I just open-sourced a different approach to the same Karpathy gist. Instead of code analysis, it's a persistent knowledge wiki with L1/l2 cache architecture ( auto-loaded rules + on-demand deep knowledge). Claude Code + Logseq/Obsidian. Full write-up: [https://mehmetgoekce.substack.com/p/i-built-karpathys-llm-wiki-with-claude](https://mehmetgoekce.substack.com/p/i-built-karpathys-llm-wiki-with-claude?trk=public_post_comment-text) Repo: [github.com/MehmetGoekce/llm-wiki](http://github.com/MehmetGoekce/llm-wiki?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply) 1 Reaction 

[![Image 14: Pablo Neirz, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://cl.linkedin.com/in/pablo-neirz-68b509159?trk=public_post_comment_actor-image)

[Pablo Neirz](https://cl.linkedin.com/in/pablo-neirz-68b509159?trk=public_post_comment_actor-name)
Data Scientist Sr. | Neurociencia y Machine Learning

 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Thank you so much for sharing. It's exactly what I was looking for!

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reactions) 2 Reactions 

[![Image 15: Akarsh Verma, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://in.linkedin.com/in/akarshverma?trk=public_post_comment_actor-image)

[Akarsh Verma](https://in.linkedin.com/in/akarshverma?trk=public_post_comment_actor-name) 1w 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[Palak Sahu](https://in.linkedin.com/in/palak-sahu-520324207?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply) 1 Reaction 

[![Image 16: Palak Sahu, graphic](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://in.linkedin.com/in/palak-sahu-520324207?trk=public_post_comment_actor-image)

[Palak Sahu](https://in.linkedin.com/in/palak-sahu-520324207?trk=public_post_comment_actor-name) 6d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

[Ishika Sahu](https://in.linkedin.com/in/ishika-sahu-900a5924a?trk=public_post_comment-text)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_comment_reply) 1 Reaction 

[See more comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_see-more-comments)
To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_feed-cta-banner-cta)

## More Relevant Posts

*   
[](https://www.linkedin.com/posts/iyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14)

[![Image 17: View profile for Iyadh Khalfallah](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://fr.linkedin.com/in/iyadh-khalfallah?trk=public_post_feed-actor-image)[Iyadh Khalfallah](https://fr.linkedin.com/in/iyadh-khalfallah?trk=public_post_feed-actor-name)  1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Can't believe this is happening 🥹 Two days ago I posted about clauditor, an open-source tool that stops Claude Code from burning through your quota in 20 minutes. 30 hours later: 4,000+ installs. 100 GitHub stars. First external PR merged. And the #1 complaint from users was clear: "I restart to save quota but lose my context." Today that's fixed. When clauditor rotates your session, it now captures Claude's own LLM-generated summary, not just file names, but the reasoning, decisions, blockers, and plan. When you open a fresh session and type "continue", it shows your recent sessions with a prompt you can copy-paste. Claude reads the file and picks up exactly where you stopped. Almost no lost context. No re-explaining your task. No starting over. The mission: make every Claude Code session predictable and efficient. You shouldn't have to choose between saving quota and keeping your context. What shipped today, all from real user feedback from the community and from the amazing team at [Thunders](https://fr.linkedin.com/company/thunders-ai?trk=public_post-text): - Session rotation with full context preservation - Claude's own session summary captured on compaction (not regex parsing — the LLM writes its own handoff) - Per-session storage (multiple conversations in the same project don't overwrite each other) - "continue" detection with copyable handoff prompts - Peak vs off-peak token analysis - Buggy Claude Code version detection (2.1.69-2.1.89 silently burns 10-20x tokens) - Quota report showing exactly where your tokens went - Audit-only mode for users who just want visibility without hooks 100 stars and 4,000 installs in 48 hours, with zero marketing budget. Just real data, a real problem, and a community that was tired of hitting their limit at 2pm. Free. Open source. Runs locally. No data leaves your machine. npm install -g @iyadhk/clauditor GitHub:[https://lnkd.in/eQWuKWFV](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeQWuKWFV&urlhash=7kKX&trk=public_post-text) If you use Claude Code, run clauditor report and see your own data. You might be surprised. [#ClaudeCode](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fclaudecode&trk=public_post-text)[#AI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fai&trk=public_post-text)[#DevTools](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevtools&trk=public_post-text)[#OpenSource](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fopensource&trk=public_post-text)

    *   ![Image 18: No alternative text description for this image](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

[![Image 19](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 20](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 21](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 645](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_social-actions-reactions)[23 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fiyadh-khalfallah_claudecode-ai-devtools-activity-7446281932298047489-2F14&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/ai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999)

[![Image 22: View organization page for AI Transfer Lab](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://de.linkedin.com/company/ai-transfer-lab?trk=public_post_feed-actor-image)[AI Transfer Lab](https://de.linkedin.com/company/ai-transfer-lab?trk=public_post_feed-actor-name) 
89 followers

 1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Having Claude write its own session handoff instead of regex parsing it is the right call regex tells you what changed, the model tells you why, and cold-starting without the 'why' is where you lose an hour. Solid fix for the rotate-and-lose-context problem.

[![Image 23: View profile for Iyadh Khalfallah](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://fr.linkedin.com/in/iyadh-khalfallah?trk=public_post_reshare_feed-actor-image)

[Iyadh Khalfallah](https://fr.linkedin.com/in/iyadh-khalfallah?trk=public_post_reshare_feed-actor-name)

Senior Software Engineer at Thunders | Ex-Jina AI | Open Source contributor 🚀

 1w 

Can't believe this is happening 🥹 Two days ago I posted about clauditor, an open-source tool that stops Claude Code from burning through your quota in 20 minutes. 30 hours later: 4,000+ installs. 100 GitHub stars. First external PR merged. And the #1 complaint from users was clear: "I restart to save quota but lose my context." Today that's fixed. When clauditor rotates your session, it now captures Claude's own LLM-generated summary, not just file names, but the reasoning, decisions, blockers, and plan. When you open a fresh session and type "continue", it shows your recent sessions with a prompt you can copy-paste. Claude reads the file and picks up exactly where you stopped. Almost no lost context. No re-explaining your task. No starting over. The mission: make every Claude Code session predictable and efficient. You shouldn't have to choose between saving quota and keeping your context. What shipped today, all from real user feedback from the community and from the amazing team at [Thunders](https://fr.linkedin.com/company/thunders-ai?trk=public_post_reshare-text): - Session rotation with full context preservation - Claude's own session summary captured on compaction (not regex parsing — the LLM writes its own handoff) - Per-session storage (multiple conversations in the same project don't overwrite each other) - "continue" detection with copyable handoff prompts - Peak vs off-peak token analysis - Buggy Claude Code version detection (2.1.69-2.1.89 silently burns 10-20x tokens) - Quota report showing exactly where your tokens went - Audit-only mode for users who just want visibility without hooks 100 stars and 4,000 installs in 48 hours, with zero marketing budget. Just real data, a real problem, and a community that was tired of hitting their limit at 2pm. Free. Open source. Runs locally. No data leaves your machine. npm install -g @iyadhk/clauditor GitHub:[https://lnkd.in/eQWuKWFV](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FeQWuKWFV&urlhash=7kKX&trk=public_post_reshare-text) If you use Claude Code, run clauditor report and see your own data. You might be surprised. [#ClaudeCode](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fclaudecode&trk=public_post_reshare-text)[#AI](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fai&trk=public_post_reshare-text)[#DevTools](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdevtools&trk=public_post_reshare-text)[#OpenSource](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fopensource&trk=public_post_reshare-text)

    *   ![Image 24: No alternative text description for this image](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

[![Image 25](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 26](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 2](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_social-actions-reactions)[2 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fai-transfer-lab_having-claude-write-its-own-session-handoff-activity-7446921397630820352-i999&trk=public_post_feed-cta-banner-cta)

*   [](https://www.linkedin.com/posts/a-better-pattern-than-mcp-for-agent-friendly-activity-7439734908614246400-TCOw) 
*   
[](https://www.linkedin.com/posts/abu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE)

[![Image 27: View profile for Abu Bakar](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://bd.linkedin.com/in/abu-bakar-siddik31?trk=public_post_feed-actor-image)[Abu Bakar](https://bd.linkedin.com/in/abu-bakar-siddik31?trk=public_post_feed-actor-name)  3d    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

Andrej Karpathy posted a gist a few days ago that’s been living rent-free in my head. He suggested that instead of just using LLMs for "one-off" RAG—where you upload a doc, ask a question, and the answer just disappears—the LLM should be used as a "bookkeeper" to maintain a living, breathing Wiki. Most of us have tried to start a personal Wiki or a team knowledge base. We usually abandon them because the "maintenance tax" is too high. You forget to link pages, you don't update the index, and eventually, the whole thing becomes a graveyard of stale info. 𝐋𝐋𝐌𝐬 𝐝𝐨𝐧'𝐭 𝐠𝐞𝐭 𝐛𝐨𝐫𝐞𝐝 𝐨𝐟 𝐦𝐚𝐢𝐧𝐭𝐞𝐧𝐚𝐧𝐜𝐞. I spent the last few weeks building 𝐀𝐱𝐢𝐨𝐦 𝐖𝐢𝐤𝐢 to automate that bookkeeping. The idea is that when you drop in a source (a PDF, a URL, or even a whole codebase), the LLM doesn't just store it. It creates entity pages, maps out new concepts, and cross-links everything to what’s already there. It turns scattered information into something that actually compounds. I’ve been testing this across a few different areas: 𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥: Filing journal entries, articles, and podcast notes to build a structured picture of goals and self-improvement over time. 𝐃𝐞𝐞𝐩 𝐑𝐞𝐬𝐞𝐚𝐫𝐜𝐡: Going deep on a topic for weeks—reading papers and reports while the LLM incrementally builds a comprehensive thesis. 𝐓𝐞𝐚𝐦 𝐃𝐨𝐜𝐬: An internal wiki fed by Slack threads and meeting transcripts. The wiki stays current because the LLM does the maintenance that no one on the team wants to do. 𝐂𝐨𝐝𝐞𝐛𝐚𝐬𝐞𝐬: Scanning a repo to generate architecture docs that actually stay in sync with the code. The constraints I set for myself: No databases or cloud lock-in. It’s all plain Markdown files. You own them. Obsidian ready. You can open the wiki folder in Obsidian and the graph view just works. Model choice. It works with Gemini, OpenAI, Claude, or fully local with Ollama. I just pushed v0.2.0 to npm and open-sourced the repo. If you’ve ever felt like your research is just sitting in "read later" apps gathering dust, I’d love for you to give this a spin. Give it a try: 𝑛𝑝𝑚 𝑖𝑛𝑠𝑡𝑎𝑙𝑙 -𝑔 𝑎𝑥𝑖𝑜𝑚-𝑤𝑖𝑘𝑖 𝑎𝑥𝑖𝑜𝑚-𝑤𝑖𝑘𝑖 𝑖𝑛𝑖𝑡 Repo: [https://lnkd.in/gsfMh-9V](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FgsfMh-9V&urlhash=l8ID&trk=public_post-text) Docs: [https://lnkd.in/g9pgq4f7](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fg9pgq4f7&urlhash=2f-T&trk=public_post-text) I’m curious—if you didn't have to worry about the maintenance, what kind of knowledge base would you build?

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

[![Image 28](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 29](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 30](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 12](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_social-actions-reactions)[2 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fabu-bakar-siddik31_andrej-karpathy-posted-a-gist-a-few-days-activity-7449097559694020608-ffNE&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/franciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG)

[![Image 31: View profile for Francisco Marques da Silva](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://pt.linkedin.com/in/franciscomarquessilva?trk=public_post_feed-actor-image)[Francisco Marques da Silva](https://pt.linkedin.com/in/franciscomarquessilva?trk=public_post_feed-actor-name)  1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

I published an article on April 4th. Karpathy published his on April 3rd. We'd never spoken. We were solving the same problem. That's either a sign I'm onto something — or that I need to get off the internet more. Probably both. Andrej Karpathy just shared an architecture he calls LLM Knowledge Bases — and it bypasses RAG entirely. No vector databases. No embeddings. No chunking ritual. Instead: a raw/ directory, an LLM that compiles raw documents into a structured, interlinked Markdown wiki, and linting passes that keep it self-healing over time. His framing is precise: the LLM isn't a reader of your documents. It's a compiler. The compiled artifact is smarter than the source material it was built from. Here's why this landed differently for me. In "Metadata Is the New Code" (published the day after his post, independently), I argued that most AI-assisted development fails not because of retrieval quality — but because domain knowledge is never externalised into a stable, reusable form. Every session re-explains what the last one established. Nothing accumulates. And in "The Drift", I described how that constant re-explanation is quietly eroding your mental model — accelerating the cognitive offloading loop until your prompts become vague, abstract, and useless without you noticing. Karpathy's compiled wiki is a structural answer to both problems simultaneously. For the agent: something worth reasoning from, that persists across sessions. For you: a forcing function that keeps your mental model sharp, because you're maintaining an artifact — not reconstructing knowledge from memory each time. The raw/ directory already exists in every organisation. Slack exports. Confluence graveyards. Incident post-mortems from people who left three years ago. Nobody has ever compiled it. That's the product. And the discipline. 🔗 Full article in comments

    *   ![Image 32: No alternative text description for this image](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

[![Image 33](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 34](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 35](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 32](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_social-actions-reactions)[7 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffranciscomarquessilva_i-published-an-article-on-april-4th-karpathy-activity-7446664227072815104-5TtG&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/vladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N)

[![Image 36: View profile for Vlad Ivanov](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://ar.linkedin.com/in/vladivanov?trk=public_post_feed-actor-image)[Vlad Ivanov](https://ar.linkedin.com/in/vladivanov?trk=public_post_feed-actor-name)  2w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

I reverse-engineered how LLMs decide what to cite. Then I built Claude Code skills to exploit the pattern. Here's the framework: THE LINKABLE ASSET FORMULA (what nobody teaches) Most people think: write great content → LLMs cite it → free backlinks. That's only Act 2 of a 3-act play. Act 0 — Find the data gap LLMs cite content that fills information voids. Not content that restates what already exists. So before writing anything, you need to confirm a gap exists. Where are people asking for data and not finding it? The system I built: → Scans Reddit for unanswered data questions → Validates each topic against Google SERPs → Classifies gaps as Confirmed, Partial, or No Gap → Ranks by demand frequency and evergreen potential Act 1 — Generate the linkable asset Once you have a confirmed gap, the article writes itself — literally. My Claude Code skill produces articles with: → Real statistics from public sources → Custom infographics → Built-in calculators and tools → Methodology sections and citations → FAQ schema markup These are the exact signals LLMs prioritize when choosing sources. Act 2 — Build authority so LLMs notice you This is the step everyone ignores. DA 0 sites don't get cited. Period. My progression: DA 0 → DA 8 in 3 weeks. Using informational content + ABC link exchanges + SearchGAP Autopilot. The full system — gap finding, article generation, authority building — runs on free Claude Code skills. What act are you stuck on? Drop your niche below — I'll tell you where to start. I broke down the full process live with real sites — link in bio 👉

    *   ![Image 37: No alternative text description for this image](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)View C2PA information ![Image 38](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

[![Image 39](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 2](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvladivanov_i-reverse-engineered-how-llms-decide-what-activity-7445122928163074048-AY3N&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE)

[![Image 40: View profile for Osama Haider](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://it.linkedin.com/in/0samahaider?trk=public_post_feed-actor-image)[Osama Haider](https://it.linkedin.com/in/0samahaider?trk=public_post_feed-actor-name)  2w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2F0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

RDF (Resource Description Framework) is a way to represent data as simple triples (subject–predicate–object), while OWL (Web Ontology Language) adds rules and logic to make that data more meaningful and intelligent. In this mini project, I built a small knowledge graph and applied OWL reasoning to automatically infer new knowledge. Example: John → type → Student Student → subclassOf → Person Result: John → type → Person (inferred) Check out the full project here: [https://lnkd.in/d2ciSnfB](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fd2ciSnfB&urlhash=_8C5&trk=public_post-text)

[![Image 41: GitHub - 0samaHaider/rdf-owl-reasoning-knowledge-graph: A simple project demonstrating how to build a knowledge graph using RDF and apply OWL reasoning to infer new knowledge automatically.](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) GitHub - 0samaHaider/rdf-owl-reasoning-knowledge-graph: A simple project demonstrating how to build a knowledge graph using RDF and apply OWL reasoning to infer new knowledge automatically. github.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fgithub%2Ecom%2F0samaHaider%2Frdf-owl-reasoning-knowledge-graph&urlhash=pJ3T&trk=public_post_feed-article-content)

[![Image 42](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 43](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 44](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 10](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2F0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2F0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2F0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2F0samahaider_github-0samahaiderrdf-owl-reasoning-knowledge-graph-activity-7444741987062243328-FoFE&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/kavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0)

[![Image 45: View profile for Kavin Prasath 🐘](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://in.linkedin.com/in/kavinprasatha?trk=public_post_feed-actor-image)[Kavin Prasath 🐘](https://in.linkedin.com/in/kavinprasatha?trk=public_post_feed-actor-name)  2w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

🚨 Holy shit. The guy who BUILT Claude Code just shared his actual workflow. Boris Cherny runs 10-15 Claude sessions in parallel every single day. While you're prompting one AI, he has 5 in his terminal + 5-10 on the web all shipping code simultaneously. And the real weapon? His [CLAUDE.md](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FCLAUDE%2Emd&urlhash=onXc&trk=public_post-text) file. Every time Claude makes a mistake, the team adds a rule so it NEVER happens again. Boris literally said: "After every correction, end with: Update your [CLAUDE.md](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FCLAUDE%2Emd&urlhash=onXc&trk=public_post-text) so you don't make that mistake again." Claude writes rules for itself. The longer you use it, the smarter it gets on YOUR codebase. His other insane detail: he hasn't written a single line of SQL in 6+ months. Claude just pulls BigQuery data directly via CLI. Claude Code now accounts for 4% of ALL public GitHub commits. Engineers who haven't set this up yet are already behind. This [CLAUDE.md](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FCLAUDE%2Emd&urlhash=onXc&trk=public_post-text) template is the difference between using AI as a chatbot vs using it as a fleet of senior engineers. Drop it in any project. Free.

    *   ![Image 46: No alternative text description for this image](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

[![Image 47](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 48](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 49](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 22](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_social-actions-reactions)[2 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fkavinprasatha_holy-shit-the-guy-who-built-claude-code-activity-7444376599644467201-cBq0&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/rineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg)

[![Image 50: View profile for Rinesh PK](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://in.linkedin.com/in/rineshpk?trk=public_post_feed-actor-image)[Rinesh PK](https://in.linkedin.com/in/rineshpk?trk=public_post_feed-actor-name)  1w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

I’ve been exploring Retrieval-Augmented Generation (RAG) patterns and built a practical implementation using .NET + PostgreSQL (pgvector). This repo focuses on: • Embedding storage and vector indexing in PostgreSQL • Semantic search using pgvector • Integrating retrieval with LLM workflows in .NET If you're working on AI-powered applications and want a simple, production-friendly RAG setup, this might be useful. Repo: [https://lnkd.in/gHnMDDTV](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2FgHnMDDTV&urlhash=THzJ&trk=public_post-text)[#ai](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fai&trk=public_post-text)[#rag](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Frag&trk=public_post-text)[#dotnet](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fdotnet&trk=public_post-text)[#postgresql](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Ffeed%2Fhashtag%2Fpostgresql&trk=public_post-text)

[![Image 51: GitHub - rineshpk/dotnet-rag-pgvector: This project demonstrates how to build a semantic search + RAG pipeline using .NET](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) GitHub - rineshpk/dotnet-rag-pgvector: This project demonstrates how to build a semantic search + RAG pipeline using .NET github.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fgithub%2Ecom%2Frineshpk%2Fdotnet-rag-pgvector&urlhash=rC1i&trk=public_post_feed-article-content)

[![Image 52](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 53](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)![Image 54](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 20](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg&trk=public_post_social-actions-reactions)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Frineshpk_github-rineshpkdotnet-rag-pgvector-this-activity-7447131072800337920-YVbg&trk=public_post_feed-cta-banner-cta)

*   
[](https://www.linkedin.com/posts/adriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg)

[![Image 55: View profile for Adriel Martins](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)](https://br.linkedin.com/in/adriel-martins-5aa30b2b1?trk=public_post_feed-actor-image)[Adriel Martins](https://br.linkedin.com/in/adriel-martins-5aa30b2b1?trk=public_post_feed-actor-name)  3w    

    *   [Report this post](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=POST&_f=guest-reporting)

MCP vs CLI... it probably doesn't depend on your taste. I was following OpenClaw founder Pete Steiberge advise and industry trend to turn all my MCPs into CLIs. I choose to use mcporter from Pete too, which does this automatically. mcporter works great, but the thing is that CLI needs proper documentation to be used fast and quickly. In order to save context bloat from MCPs, you then need to offload this to skills files or your [AGENT.md](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FAGENT%2Emd&urlhash=-3Cb&trk=public_post-text). So I turned my only two MCPs: context7 (code docs search) and Exa (web search), into CLIs with the skills files. But man, that was a bit painful. As I need to describe in great details all the tools and their behaviour. Honestly, not fun. MCPs already have the tool, resources and prompts built-in. mcporter only loads this on-demand, and for things as critical as web search, I need this to be available like all the time. Bottom line: If your MCP is fundamental to an AI Agent, maybe just use it. If it is a nice to have, then turn it into a CLI with skills, or use the single universal MCP pattern. This is that pattern where you have a single MCP that searches and executes all the other MCPs tools. No context bloat. Link for mcporter: [https://lnkd.in/g5yPFErT](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Flnkd%2Ein%2Fg5yPFErT&urlhash=OrAH&trk=public_post-text)

[![Image 56: GitHub - steipete/mcporter: Call MCPs via TypeScript, masquerading as simple TypeScript API. Or package them as cli.](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) GitHub - steipete/mcporter: Call MCPs via TypeScript, masquerading as simple TypeScript API. Or package them as cli. github.com](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fgithub%2Ecom%2Fsteipete%2Fmcporter&urlhash=WgUP&trk=public_post_feed-article-content)

[![Image 57](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe) 5](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_social-actions-reactions)[3 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_social-actions-comments)

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_like-cta)[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_comment-cta)

 Share 
    *   Copy
    *   LinkedIn
    *   Facebook
    *   X

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fadriel-martins-5aa30b2b1_github-steipetemcporter-call-mcps-via-activity-7442582043600863232-8Mkg&trk=public_post_feed-cta-banner-cta)

![Image 58](https://media.licdn.com/dms/image/v2/D4E16AQHzwSyjgc6LEw/profile-displaybackgroundimage-shrink_200_800/B4EZdjLWLUH0Ak-/0/1749715608719?e=2147483647&v=beta&t=SoHClpsEKD4loHpfzIYuulPn0pfF2E-i9wjoSYq_riM)

![Image 59: Rohit Ghumare](https://media.licdn.com/dms/image/v2/D5603AQECN5nRIGZqkA/profile-displayphoto-scale_200_200/B56Zyir4oWIYAY-/0/1772255941077?e=2147483647&v=beta&t=WZO2L2Pct6QuUqUtXH4XqlHQhqFRxpTi-GuL_ODR95E)
50,115 followers

*   [1,293 Posts](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fin%2Frohit-ghumare%2Frecent-activity%2F&trk=public_post_follow-posts)
*   [11 Articles](https://www.linkedin.com/today/author/rohit-ghumare?trk=public_post_follow-articles)

[View Profile](https://uk.linkedin.com/in/rohit-ghumare?trk=public_post_follow-view-profile)[Connect](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Ffeed%2Fupdate%2Furn%3Ali%3Aactivity%3A7446887124454236160&trk=public_post_follow)

## More from this author

*   [![Image 60](https://static.licdn.com/aero-v1/sc/h/9l8dv1r8a09nem281grvopn9l) ### Langchain Expression Language - AIShorts #2 Rohit Ghumare 9mo](https://www.linkedin.com/pulse/langchain-expression-language-aishorts-2-rohit-ghumare-oncge?trk=public_post)
*   [![Image 61](https://media.licdn.com/dms/image/v2/D4E12AQF2RLarAm4fBQ/article-cover_image-shrink_720_1280/B4EZcqvmvVH0AI-/0/1748768813587?e=2147483647&v=beta&t=cqhIRf4zle3TEGh09-cwqdUVBnfFU-ur4a7V_P_EYQ0) ### AI Native DevOps is Here... Revolution Every Developer Needs to See Right NOW! Rohit Ghumare 10mo](https://www.linkedin.com/pulse/ai-native-devops-here-revolution-every-developer-needs-rohit-ghumare-murhe?trk=public_post)
*   [![Image 62](https://media.licdn.com/dms/image/v2/D4D12AQE5eq2BOFxHQQ/article-cover_image-shrink_720_1280/B4DZamT8LrG0AQ-/0/1746546968128?e=2147483647&v=beta&t=9awnj5ucorKq-e7yY5FO9IRCgNXeWkPzS0XBQcGmH3g) ### Kubernetes 1.33 Release, AI Agents for DevOps, and KubeCon Highlights 🚀 Rohit Ghumare 11mo](https://www.linkedin.com/pulse/kubernetes-133-release-ai-agents-devops-kubecon-rohit-ghumare-wdymf?trk=public_post)

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

[](https://www.linkedin.com/posts/rohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-share-7446887123250647040-KQUe)

![Image 63](https://static.licdn.com/aero-v1/sc/h/5k9cgtx8rhoyqkcxfoncu1svl)
## Join now to view more content

Create your free account or sign in to continue your search

 Email or phone  

 Password  

Show

[Forgot password?](https://www.linkedin.com/uas/request-password-reset?trk=csm-v2_forgot_password) Sign in 

[Join with email](https://www.linkedin.com/signup/cold-join?session_redirect=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Fposts%2Frohit-ghumare_karpathy-just-published-his-llm-wiki-pattern-activity-7446887124454236160-iCXK&trk=public_post_contextual-sign-in-modal_join-with-email-cta)

or

Already on LinkedIn? [Sign in](https://www.linkedin.com/login?trk=public_post_contextual-sign-in-modal_sign-in-link)

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).
