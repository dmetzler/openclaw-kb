---
title: "Making Sense of Harness Engineering"
source: "https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf"
date: 2025-01-01
author: "Henrique Bastos"
ingested: 2026-04-15T16:43:15.910Z
tags: [knowledge]
---
Title: Making sense of Harness Engineering

URL Source: https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf

Markdown Content:
# Making sense of Harness Engineering

Agree & Join LinkedIn

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).

[Skip to main content](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf#main-content)[LinkedIn](https://www.linkedin.com/?trk=article-ssr-frontend-pulse_nav-header-logo)
*   [Top Content](https://www.linkedin.com/top-content?trk=article-ssr-frontend-pulse_guest_nav_menu_topContent)
*   [People](https://www.linkedin.com/pub/dir/+/+?trk=article-ssr-frontend-pulse_guest_nav_menu_people)
*   [Learning](https://www.linkedin.com/learning/search?trk=article-ssr-frontend-pulse_guest_nav_menu_learning)
*   [Jobs](https://www.linkedin.com/jobs/search?trk=article-ssr-frontend-pulse_guest_nav_menu_jobs)
*   [Games](https://www.linkedin.com/games?trk=article-ssr-frontend-pulse_guest_nav_menu_games)

[Sign in](https://www.linkedin.com/uas/login?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&fromSignIn=true&trk=article-ssr-frontend-pulse_nav-header-signin)[Join now](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_nav-header-join)[![Image 1](https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2)](https://www.linkedin.com/uas/login?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&fromSignIn=true&trk=article-ssr-frontend-pulse_nav-header-signin)

![Image 2: Making sense of Harness Engineering](https://media.licdn.com/dms/image/v2/D4D12AQHCCb6h5K-YJA/article-cover_image-shrink_720_1280/B4DZ10R_89KIAI-/0/1775772369300?e=2147483647&v=beta&t=Zhv3nhmxlAJPQe_61O54w6q6AsBr839avIwAHd1uH5I)

# Making sense of Harness Engineering

*   [Report this article](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=PONCHO_ARTICLE&_f=guest-reporting)

[Henrique Bastos](https://br.linkedin.com/in/henriquebastos)![Image 3: Henrique Bastos](https://media.licdn.com/dms/image/v2/D4E03AQHPy0_kTcW5pA/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1672771049762?e=2147483647&v=beta&t=3fvPa3j0l-oplUnsI2wb9AjfUu-w-cItBHboQKDm684)

### Henrique Bastos

 Published Apr 9, 2026 

[+ Follow](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_publisher-author-card)

A harness is what channels a horse's strength so the force serves a purpose, repeatedly. You don't create the horse's strength. You channel it so the force serves a purpose, repeatedly, without having to tame the horse again each time.

A hydroelectric dam works the same way. The water and gravity already exist. Without the dam, the river flows and the energy dissipates. With the dam, every cycle of water generates work. The reservoir level is the accumulated state. Nobody needs to remember how much water there is. The gauge tells you.

And it's literally a loop: water falls, generates energy, evaporates, rains, fills the reservoir, falls again.

This is the idea I keep circling back to. When I pair with friends. When I read about AI agent workflows. When I notice some teams compounding their gains while others run in place.

> A harness is what turns an ad hoc process into a loop by making the cost of the next iteration approach zero.

You don't create the force. You build the channel.

### What makes a process ad hoc

An ad hoc process is one that's designed from scratch every time it runs. No structure carries over. No learning accumulates. Each execution is independent of the last.

Context lives in someone's head. Restarting requires that person to reconstruct the setup and push through the same friction all over again.

Four properties define an ad hoc process:

1.   Output doesn't feed input
2.   Restarting requires human memory
3.   Each execution costs roughly the same as the first
4.   Context is lost between executions

A process becomes a loop when those properties flip:

1.   Output IS the setup for the next execution
2.   No one needs to remember anything
3.   The marginal cost of the next iteration drops toward zero
4.   Context accumulates in artifacts, not in heads

Deming described the loop in the 1950s. Plan, Do, Check, Act. Toyota built an empire on it. What none of them named was the infrastructure that makes the loop possible. Without it, PDCA is just a poster on the wall.

The harness is that infrastructure. The thing that converts one list into the other. The dam that turns a river into a power source.

### The harness fractal

This isn't just about code. The pattern operates at every level of abstraction.

In code, a test suite is the simplest harness. The test output IS the input for the next decision. Cost of the next iteration: near zero.

In tasks, a skill is a single command that encapsulates a procedure: commit, deploy, lint, migrate. The procedure is encoded, not remembered. That's a harness at the task level.

In workflows, a well-designed workflow moves through states: todo, in progress, review, done. Each state produces what the next needs. Artifacts carry context between states, not people's memory.

In systems, an orchestrator polls, dispatches, executes, reconciles, polls again. Retry happens with backoff, scoped to the failing unit. The system doesn't need a human to restart it.

In codebases, every new contributor starts from a better baseline than the last. The docs, linters, structural tests, and principles that encode "good" are the harness. Quality compounds across sessions.

At every level, the pattern is identical. The harness is what makes the next iteration cheap.

### Harness engineering was invented in 1999

In 1999, Kent Beck published Extreme Programming Explained. Every practice in that book is a harness-construction technique. We just didn't have a name for the meta-pattern.

1.   TDD stabilizes the code after every change. You know immediately if something broke, instead of wandering through side effects trying to find what went wrong.
2.   Small releases keep each iteration small enough to understand. When something fails, you know exactly what changed.
3.   Continuous integration guarantees the codebase is always in a working state. Every iteration starts from a green baseline, not from "let me fix the build first."
4.   Refactoring keeps the design simple enough to change safely. Without it, complexity accumulates until every change is a risk and every iteration starts with "I need to understand this first."
5.   Pair programming adds a convergence loop between two minds. The machine only executes your commands. A pair challenges your reasoning in real time, catching flawed assumptions before they become code.
6.   Collective ownership means anyone can pick up any part of the work. The loop doesn't block waiting for the one person who knows.
7.   Coding standards make the code look the same everywhere. You read structure, not style. Signal, not noise.

AI agents need all of these properties to function. A codebase without them is an ad hoc process for the agent. Every session starts from scratch. The cost never drops.

Before AI, the cost of not doing XP was systemic. It showed up in lead time, incidents, throughput at the organizational level. Individual developers felt the inefficiency as stress, but the metric they used to evaluate themselves was personal coding speed. And by that metric, XP looked slower. Tests before code. Refactoring things that already work. Pairing when you could be coding alone.

The real cost was invisible because it was distributed across the system. Their measurement was local; the damage was global.

Writing code is not the bottleneck anymore. What's expensive is the environment not being ready for the next iteration. The AI agent stalls, produces garbage, doesn't converge. The cause is the absence of the properties XP always demanded. The cost that used to live at the company level moved to the individual.

XP was always harness engineering. The cost of ignoring it was always real. But it was hidden behind an organizational abstraction. AI made it personal and immediate. Developers who don't master XP values aren't just "slower." They're incompatible with the tool. They end up stuck in chat mode, running the loop manually, one prompt at a time.

### The minimum viable harness

"Systematizing is expensive." I hear this from friends all the time. It doesn't have to be.

Years ago, I visited a friend's office. He had a fancy espresso machine and offered me one. I asked if I could make it myself. He agreed.

I went through the full process myself: weighing the beans, grinding them to a certain size, brewing. When I finished pouring, I started cleaning up. He stopped me. Their culture was to clean before you use the machine, not after. You leave the mess for the next person, who cleans it as part of their setup.

## Recommended by LinkedIn

[![Image 4: Engineering Simulation as a Strategic Business Capability - Part 2](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) Engineering Simulation as a Strategic Business… Gary Panes 10 years ago](https://www.linkedin.com/pulse/engineering-simulation-strategic-business-capability-gary-panes-1)

[![Image 5: What is Real Engineering?](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) What is Real Engineering? Matt Bishop 5 years ago](https://www.linkedin.com/pulse/what-real-engineering-matt-bishop)

[![Image 6: The Big Issues in Engineering Simulation- Democratisation](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) The Big Issues in Engineering Simulation-… David Quinn 8 years ago](https://www.linkedin.com/pulse/big-issues-engineering-simulation-democratisation-david-quinn)

That sparked an intense discussion. My argument: keeping the system tidy and ready reduces the time to value. If you clean after, you're already sipping your coffee while you do it. The machine is always ready for the next person. Walk up, press go, drink. If you clean before, the next person walks up to a dirty machine and has to wait through cleanup before they even start.

We disagreed. Their culture was settled. But the story stayed with me for years, because it captures a design decision that matters: where does the setup cost live in the loop?

Their version optimized for the current user's exit speed. My version optimized for the next iteration's time to value. That's the difference between a process that feels ready and one that feels like work before the work.

Readiness isn't just faster. It's emotionally lighter. You walk up to a clean machine, a green test suite, a repo that passes CI. The cost of starting is near zero. You don't have to think. You just go.

You don't need to reinvent your processes. You need to find the right places to draw clear boundaries.

A minimum viable harness is just that: one entry, one exit, clear boundaries. Inside the boundaries, non-determinism is free to happen. Outside, the world sees a stable interface. You don't need to control the interior. You need to contain it.

Programmers know what happens when functions mutate global state, depend on hidden variables, and produce differently shaped outputs depending on which path they took. Debugging becomes archaeology.

Processes break the same way. When boundaries aren't clear, effects leak between iterations. Someone needs to remember where things were. Setup cost grows. The loop degrades into ad hoc execution.

Start with one boundary. One process that today requires someone to remember where things were. Draw the entry, draw the exit, make it leave the system ready for the next run. That's enough. The rest improves with time, because now you have a loop, and loops compound.

### Improvement is not a separate phase

Most people treat improvement as something you do later, when there's time. There's never time. The trick is to make every iteration of the loop generate information about its own performance.

Remember the espresso experiments? Each shot told me something. Too bitter: grind too fine. Too watery: dose too low. Sour: extraction too short. I didn't need to stop and analyze. The information was in the output itself. The feedback wasn't a separate step. It was the taste.

I do this with my AI coding sessions. After each session, an automated review analyzes the transcript. Command line errors. Divergences between what was implemented and what code review found. Repeated commands that signal a missing tool. Moments where the agent wrote a throwaway script to parse something that should have been simpler. Every deviation is a signal pointing at a gap in the harness.

Every iteration produces different output. That's not a bug, it's the reason loops work. Each run is a sample. Some converge, some don't. The ones that don't aren't failures. They're signals pointing at where to tighten the boundaries next. Capture what happened, because that's how the harness gets better.

### Where humans stay

My first instinct with AI agents was to stay in the loop. Chat mode. Give an instruction, read the output, correct the mistakes, give the next instruction. I was the state machine. Every session started from my memory of the last one.

It was exhausting, and it didn't scale. I was correcting the agent instead of improving the environment. Each fix died with the session. The next session started from the same broken baseline.

The shift happened when I realized my job wasn't to correct the agent. It was to improve the harness so the agent doesn't need correction. When the agent produces garbage, the answer isn't a better prompt. It's a better linter rule, a clearer spec, a tighter boundary. Fix the environment, let the agent retry. That fix compounds. The prompt fix doesn't.

This reframes where humans belong in the loop. Not inside it, correcting each step. Between iterations, improving the conditions for the next run.

In practice, humans do three things:

1.   Steer. Set the goal for the next iteration. Build this feature. Fix this bug. Direction, not execution.
2.   Evaluate. Good enough. Needs rework. Wrong approach. Quality judgment at the boundary.
3.   Improve the harness. New linter rule. Tighter constraints. A better workflow state. Meta-work that compounds.

The moment you find yourself carrying state between iterations, making routing decisions inside the loop, or being the only way to detect completion, you've reintroduced ad hoc execution. Step out. Encode what you know into the harness. Let the loop run.

The loop teaches you where human judgment actually matters. It's usually in far fewer places than you think.

### Brownfield and greenfield

Most developers work in brownfield. Large codebases, legacy processes, no clean slate. You can't stop everything and rebuild with harnesses. You don't need to.

The Strangler Fig pattern applies directly. Build a small loop beside the ad hoc system. Handle one slice of the work. Gradually route more to the loop until the ad hoc process starves.

1.   Pick the most painful repetition. Not the most important system. The one where someone repeats the same manual work every week and hates it.
2.   Build the loop for just that slice. One entry, one exit. The output is the setup for the next run. It doesn't replace the full system. It handles one path.
3.   Let the ad hoc system stay alive. The loop handles case A. Cases B and C go through the old way. Next month, A and B. The ad hoc process eventually handles nothing.
4.   Never big-bang. "Let's redesign everything as loops" is an ad hoc project to build a loop system. Ironic. It will fail for the same reasons ad hoc processes always fail.

I've been doing this in large codebases that aren't AI-first. You draw boundaries in new areas of the code, add harness progressively as you evolve. The existing code doesn't need to change all at once. The strangler fig IS a loop. Each iteration claims a little more territory.

In greenfield, the equation is different. If you're starting from scratch, start AI-first. Build the boundaries from day one. The cost of adding harness later is always higher than building it in from the start.

* * *

The hardest shift for a programmer isn't learning a new tool. It's resisting the instinct to tell the machine what to do. We've spent entire careers giving instructions. Write this function. Fix this bug. Deploy this. The muscle memory is deep.

Harness engineering asks you to step back. Stop telling the machine what to do. Start building the environment where the machine figures it out. The payoff isn't immediate. The first iteration is slow. But the second is faster. And the third. And every one after that.

An ad hoc process costs the same forever. A loop costs less every iteration. That's compounding.

Next time an AI agent produces garbage, don't fix the prompt. Fix the environment. Add a linter rule. Write a test. Tighten a boundary. That's your first harness. The rest follows.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_like-toggle_like-cta)

![Image 7: Like](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Like

![Image 8: Celebrate](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Celebrate

![Image 9: Support](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Support

![Image 10: Love](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Love

![Image 11: Insightful](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Insightful

![Image 12: Funny](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)Funny

[Comment](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_comment-cta)

*   Copy
*   LinkedIn
*   Facebook
*   X

 Share 

[![Image 13](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 14](https://static.licdn.com/aero-v1/sc/h/a0e8rff6djeoq8iympcysuqfu)![Image 15](https://static.licdn.com/aero-v1/sc/h/asiqslyf4ooq7ggllg4fyo4o2) 259](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_likes-count_social-actions-reactions)[26 Comments](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_likes-count_social-actions-comments)

[![Image 16: Tarsis Azevedo, graphic](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)](https://br.linkedin.com/in/tarsisazevedo?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-image)

[Tarsis Azevedo](https://br.linkedin.com/in/tarsisazevedo?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-name) 2d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Great article! I think this is the best metaphor on how to use AI in our daily work. It reminds me of the essay from Dijkstra, the humble programmer, which could be written now, with minor changes, 54 years later. "Programming will remain very difficult, because once we have freed ourselves from the circumstantial cumbersomeness, we will find ourselves free to tackle the problems that are now well beyond our programming capacity."

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reply)[2 Reactions](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reactions) 3 Reactions 

[![Image 17: Israel Teixeira, graphic](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)](https://br.linkedin.com/in/israelst?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-image)

[Israel Teixeira](https://br.linkedin.com/in/israelst?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-name) 3d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

What a painting you drew here, my friend! I'm glad to have met you at the beginning of my career... Reading your text felt like tasting XP for the first time again.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reactions) 2 Reactions 

[![Image 18: Gatis Setlers, graphic](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)](https://lv.linkedin.com/in/gatis-setlers-58806130?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-image)

[Gatis Setlers](https://lv.linkedin.com/in/gatis-setlers-58806130?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-name) 4d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Agree 100%, a great post

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reactions) 2 Reactions 

[![Image 19: Nikita Belokopytov, graphic](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)](https://de.linkedin.com/in/nbelokopytov?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-image)

[Nikita Belokopytov](https://de.linkedin.com/in/nbelokopytov?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-name) 4d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

Sounds reasonable as a concept. Could you provide some examples of good harnesses vs bad ones?

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reply)[1 Reaction](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reactions) 2 Reactions 

[![Image 20: Alexandre Poitevin, graphic](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)](https://dz.linkedin.com/in/devopscraftsman?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-image)

[Alexandre Poitevin](https://dz.linkedin.com/in/devopscraftsman?trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_actor-name) 4d 

*   [Report this comment](https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_ellipsis-menu-semaphore-sign-in-redirect&guestReportContentType=COMMENT&_f=guest-reporting)

This article is gold! Excellent writing, super insightful, impactful framing. Thanks a lot Except for one bit: "Writing code is not the bottleneck anymore" It was likely never the bottleneck, except in very narrow situations, for some companies and teams. Most likely bottlenecks were: knowing what to build in the first place, clarity around specs, too many hands-off, fragmented process, testing strategies, quality issues, etc… Writing is a very little part of the process overall, but too many people are focusing over it, this is why the dysfunctions *AROUND IT* are super visible with the AI boost these days.

[Like](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_like)[Reply](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reply)[3 Reactions](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments-action_comment_reactions) 4 Reactions 

[See more comments](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_comments_comment-see-more)

To view or add a comment, [sign in](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=article-ssr-frontend-pulse_x-social-details_feed-cta-banner-cta)

## More articles by Henrique Bastos

*   [The Art of Code Organization: Affinity vs Similarity](https://www.linkedin.com/pulse/art-code-organization-affinity-vs-similarity-henrique-bastos)![Image 21](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) Apr 27, 2023 
### The Art of Code Organization: Affinity vs Similarity

As developers, we often find ourselves working on projects where the organization of code can greatly impact its…

![Image 22](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 23](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 24](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) 50   1 Comment     
*   [How ChatGPT quickly helped me understand Django’s source code](https://www.linkedin.com/pulse/how-chatgpt-quickly-helped-me-clear-doubts-djangos-source-bastos)![Image 25](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) Feb 25, 2023 
### How ChatGPT quickly helped me understand Django’s source code

I was reading Django’s source code to design a custom model field. I’ve also read the specific documentation page for…

![Image 26](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 27](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 28](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) 45     
*   [Como trilhar o caminho do Desenvolvedor Sênior](https://pt.linkedin.com/pulse/como-trilhar-o-caminho-do-desenvolvedor-s%C3%AAnior-henrique-bastos)![Image 29](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) May 20, 2020 
### Como trilhar o caminho do Desenvolvedor Sênior

Ser um programador sênior é a meta da maioria dos devs. Afinal, é nessa faixa do mercado que estão os melhores salários.

![Image 30](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 31](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) 30   2 Comments     
*   [4 passos simples para você ter autonomia de verdade na sua vida](https://pt.linkedin.com/pulse/4-passos-simples-para-voc%C3%AA-ter-autonomia-de-verdade-na-bastos)![Image 32](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) Nov 20, 2019 
### 4 passos simples para você ter autonomia de verdade na sua vida

Quantas decisões na sua vida são tomadas por você mesmo? Pense bem..

![Image 33](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 34](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)![Image 35](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf) 53   4 Comments     
*   [Ela conseguiu o emprego dos sonhos antes mesmo de terminar a faculdade](https://pt.linkedin.com/pulse/ela-conseguiu-o-emprego-dos-sonhos-mesmo-sem-ter-tanta-bastos)![Image 36](https://media.licdn.com/dms/image/v2/C4D12AQF80iBSAn2q1w/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1572127678464?e=2147483647&v=beta&t=sM4wrIyZYRVi0CMLHPrBGOCigovF826vuXw3bmEpQ94) Oct 26, 2019 
### Ela conseguiu o emprego dos sonhos antes mesmo de terminar a faculdade

Um dos primeiros passos que um programador precisa dar para conseguir se destacar no mercado de tecnologia é migrar da…

![Image 37](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 38](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v)![Image 39](https://static.licdn.com/aero-v1/sc/h/asiqslyf4ooq7ggllg4fyo4o2) 81   1 Comment     
*   [Autonomize-se: Descubra a habilidade de ser você mesmo](https://pt.linkedin.com/pulse/autonomize-se-descubra-habilidade-de-ser-voc%C3%AA-mesmo-henrique-bastos)![Image 40](https://media.licdn.com/dms/image/v2/C4D12AQFrebLqDdqhQQ/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1571161857402?e=2147483647&v=beta&t=mEd-gMfrdPw-OYj4Fa19_ZO12L6GOI_1OMEk5BIVrqU) Oct 15, 2019 
### Autonomize-se: Descubra a habilidade de ser você mesmo

Para mim, autonomia não é o mesmo que independência e nem abundância de recursos. Também não é empreender ou virar…

![Image 41](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 42](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v)![Image 43](https://static.licdn.com/aero-v1/sc/h/asiqslyf4ooq7ggllg4fyo4o2) 31   1 Comment     
*   [3 Atitudes Essenciais Para Quem Quer Migrar Da CLT Para PJ](https://pt.linkedin.com/pulse/3-atitudes-essenciais-para-quem-quer-migrar-da-clt-pj-henrique-bastos)![Image 44](https://media.licdn.com/dms/image/v2/C4D12AQG88aehVvfaVQ/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1565982694341?e=2147483647&v=beta&t=04F7LtNXy_1oCZ5lOIOYS6xzFbPD6i9hfc4xKAQkvCE) Aug 16, 2019 
### 3 Atitudes Essenciais Para Quem Quer Migrar Da CLT Para PJ

Durante boa parte de nossas vidas, vendem para gente que o emprego é a única forma de trabalho possível. E não é.

![Image 45](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 46](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v)![Image 47](https://static.licdn.com/aero-v1/sc/h/asiqslyf4ooq7ggllg4fyo4o2) 27     
*   [3 estratégias que vão mudar sua forma de desenvolver software](https://pt.linkedin.com/pulse/3-estrat%C3%A9gias-que-v%C3%A3o-mudar-sua-forma-de-desenvolver-software-bastos)![Image 48](https://media.licdn.com/dms/image/v2/C4D12AQHWh6zanIChFA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1556888757183?e=2147483647&v=beta&t=U1r15_lM6k4eu-KBSJzLp_HLmjq2Ysm03_aTDgGjoGA) May 3, 2019 
### 3 estratégias que vão mudar sua forma de desenvolver software

Imagine a seguinte situação. Você está sendo operado do coração em um hospital e, de repente, ouve o médico dizer que…

![Image 49](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671)![Image 50](https://static.licdn.com/aero-v1/sc/h/2tzoeodxy0zug4455msr0oq0v)![Image 51](https://static.licdn.com/aero-v1/sc/h/a0e8rff6djeoq8iympcysuqfu) 25   2 Comments     
*   [Evolua a sua carreira na programação — Parte 2/3](https://pt.linkedin.com/pulse/evolua-sua-carreira-na-programa%C3%A7%C3%A3o-parte-23-henrique-bastos)![Image 52](https://media.licdn.com/dms/image/v2/C4D12AQE3AlOfqCIJOA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1556306858867?e=2147483647&v=beta&t=-TAuHZJYA-0tRIV4h6opIowLO2lodB2Gweg5FXg3ngA) Apr 26, 2019 
### Evolua a sua carreira na programação — Parte 2/3

No artigo anterior, eu falei sobre três das dez habilidade-chaves que um desenvolvedor deve ter para ser mais eficaz e…

![Image 53](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671) 7     
*   [Evolua a sua carreira na programação — Parte 1/3](https://pt.linkedin.com/pulse/evolua-sua-carreira-na-programa%C3%A7%C3%A3o-parte-13-henrique-bastos)![Image 54](https://media.licdn.com/dms/image/v2/C4D12AQGWbQDchxi8cA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1555451708056?e=2147483647&v=beta&t=gPI75Qu2Q_46G4X8jqTI52vzi9qsaC5gFlm6K-6Dw4A) Apr 16, 2019 
### Evolua a sua carreira na programação — Parte 1/3

O programador é uma máquina de transformar café em código. Essa piada, muito comum no nosso meio, pode até ser…

![Image 55](https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671) 13     

 Show more 

[See all articles](https://br.linkedin.com/in/henriquebastos/recent-activity/articles/)

## Others also viewed

*   [![Image 56](https://media.licdn.com/dms/image/v2/C5612AQEMYMJrnLNYTA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520087964006?e=2147483647&v=beta&t=3vqQTxoCzEo8XRac4OJPBdkITgap_5PsxulvrJDyyMM) ### The Big Issues in Engineering Simulation- Democratisation David Quinn 8y](https://www.linkedin.com/pulse/big-issues-engineering-simulation-democratisation-david-quinn)
*   [![Image 57](https://media-exp1.licdn.com/media/AAYQAgQLAAkAAQAAAAAAAA196XghfnplQFCx7y__C0e55w.png) ### Inside the Boundary: When Interactions Matter More Than Components Sam Matic 2mo](https://www.linkedin.com/pulse/inside-boundary-when-interactions-matter-more-than-components-matic-7hw8f)
*   [![Image 58](https://media.licdn.com/dms/image/v2/D4E12AQH6Mxhhen1NjQ/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1738067339222?e=2147483647&v=beta&t=ZDIXHxMluy2PGcIF-Doo0ly2LFYwrRCjYVFKLBGMbY0) ### AI in Engineering and Design Matthias Bauer 1y](https://www.linkedin.com/pulse/ai-engineering-design-matthias-bauer-la9xe)
*   [![Image 59](https://media-exp1.licdn.com/media/AAYQAgQLAAkAAQAAAAAAAA196XghfnplQFCx7y__C0e55w.png) ### Five Axioms for Reverse Robust Engineering Brian K. B. 8y](https://www.linkedin.com/pulse/five-axioms-reverse-robust-engineering-brian-k-bartnick)
*   [![Image 60](https://media.licdn.com/dms/image/v2/D5612AQFQbg7yGo-bJg/article-cover_image-shrink_720_1280/B56ZzagepbHcAI-/0/1773192485925?e=2147483647&v=beta&t=dISA56mC7A0NF5BwN3uGCnk0h5AlCtGO_BGnMYk-LLY) ### HARNESS ENGINEERING: Contextual Engineering Is So Yesterday Iqbal Zainal 1mo](https://www.linkedin.com/pulse/harness-engineering-contextual-so-yesterday-iqbal-zainal-ttt1c)
*   [![Image 61](https://media.licdn.com/dms/image/v2/C4E12AQHdY19-M7-5Ow/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520134464344?e=2147483647&v=beta&t=KTqtBGXeShPq1ECjNluLysVQFMrBdS6R1FHiqIb2U7A) ### I Don't Care About Engineering Joshua West 8y](https://www.linkedin.com/pulse/i-dont-care-engineering-joshua-west)
*   [![Image 62](https://media.licdn.com/dms/image/v2/C4D12AQFQ_MCSmVKRvg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1618130762044?e=2147483647&v=beta&t=1uGJJkIgtzGKZF4ju1wz8Bdn-0HJ7ExkAW8Q2kHzqc8) ### Prince Philip and Engineering... Keith Hanna 5y](https://www.linkedin.com/pulse/prince-philip-engineering-keith-hanna)
*   [![Image 63](https://media.licdn.com/dms/image/v2/D4E12AQGPA-weF-e7Mg/article-cover_image-shrink_720_1280/B4EZ0r_SbSJcAI-/0/1774559506610?e=2147483647&v=beta&t=PbnXbcwPmf21hTRalcGITfJr_ibQf0mn275sfGcIgd4) ### From Prompt Engineering to Harness Engineering Tao Jin 2w](https://www.linkedin.com/pulse/from-prompt-engineering-harness-tao-jin-zhzae)
*   [![Image 64](https://media.licdn.com/dms/image/v2/D4E12AQFgBPQ2N0a9Ew/article-cover_image-shrink_720_1280/B4EZcgZ8flHsAU-/0/1748595364913?e=2147483647&v=beta&t=_y0DP_wQ_TELfW09Uw0zYadENyZtoevdpvfXSlmb7F8) ### 🔧 Engineering Beyond Equations: Why Purpose Matters More Than Perfection Rodi Ali 10mo](https://www.linkedin.com/pulse/engineering-beyond-equations-why-purpose-matters-more-roodi-ali-8kbue)
*   [![Image 65](https://media-exp1.licdn.com/media/AAYQAgQLAAkAAQAAAAAAAA196XghfnplQFCx7y__C0e55w.png) ### How Can Engineers Remain Relevant in the Not-so-distant Future? Chukwudum CHUKWUEDO 11y](https://www.linkedin.com/pulse/20140621043017-156886075-how-engineers-can-remain-relevant-in-the-not-so-distant-future)

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
*   [Recruitment & HR](https://www.linkedin.com/top-content/recruitment-hr/)
*   [Customer Experience](https://www.linkedin.com/top-content/customer-experience/)
*   [Real Estate](https://www.linkedin.com/top-content/real-estate/)
*   [Marketing](https://www.linkedin.com/top-content/marketing/)
*   [Sales](https://www.linkedin.com/top-content/sales/)
*   [Retail & Merchandising](https://www.linkedin.com/top-content/retail-merchandising/)
*   [Science](https://www.linkedin.com/top-content/science/)
*   [Supply Chain Management](https://www.linkedin.com/top-content/supply-chain-management/)
*   [Future Of Work](https://www.linkedin.com/top-content/future-of-work/)
*   [Consulting](https://www.linkedin.com/top-content/consulting/)
*   [Writing](https://www.linkedin.com/top-content/writing/)
*   [Economics](https://www.linkedin.com/top-content/economics/)
*   [Artificial Intelligence](https://www.linkedin.com/top-content/artificial-intelligence/)
*   [Employee Experience](https://www.linkedin.com/top-content/employee-experience/)
*   [Workplace Trends](https://www.linkedin.com/top-content/workplace-trends/)
*   [Fundraising](https://www.linkedin.com/top-content/fundraising/)
*   [Networking](https://www.linkedin.com/top-content/networking/)
*   [Corporate Social Responsibility](https://www.linkedin.com/top-content/corporate-social-responsibility/)
*   [Negotiation](https://www.linkedin.com/top-content/negotiation/)
*   [Communication](https://www.linkedin.com/top-content/communication/)
*   [Engineering](https://www.linkedin.com/top-content/engineering/)
*   [Hospitality & Tourism](https://www.linkedin.com/top-content/hospitality-tourism/)
*   [Business Strategy](https://www.linkedin.com/top-content/business-strategy/)
*   [Change Management](https://www.linkedin.com/top-content/change-management/)
*   [Organizational Culture](https://www.linkedin.com/top-content/organizational-culture/)
*   [Design](https://www.linkedin.com/top-content/design/)
*   [Innovation](https://www.linkedin.com/top-content/innovation/)
*   [Event Planning](https://www.linkedin.com/top-content/event-planning/)
*   [Training & Development](https://www.linkedin.com/top-content/training-development/)

 Show more  Show less 

*   LinkedIn© 2026
*   [About](https://about.linkedin.com/?trk=d_flagship2_pulse_read_footer-about)
*   [Accessibility](https://www.linkedin.com/accessibility?trk=d_flagship2_pulse_read_footer-accessibility)
*   [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=d_flagship2_pulse_read_footer-user-agreement)
*   [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=d_flagship2_pulse_read_footer-privacy-policy)
*   [Your California Privacy Choices](https://www.linkedin.com/legal/california-privacy-disclosure?trk=d_flagship2_pulse_read_footer-california-privacy-rights-act)
*   [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=d_flagship2_pulse_read_footer-cookie-policy)
*   [Copyright Policy](https://www.linkedin.com/legal/copyright-policy?trk=d_flagship2_pulse_read_footer-copyright-policy)
*   [Brand Policy](https://brand.linkedin.com/policies?trk=d_flagship2_pulse_read_footer-brand-policy)
*   [Guest Controls](https://www.linkedin.com/psettings/guest-controls?trk=d_flagship2_pulse_read_footer-guest-controls)
*   [Community Guidelines](https://www.linkedin.com/legal/professional-community-policies?trk=d_flagship2_pulse_read_footer-community-guide)
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

[](https://www.linkedin.com/pulse/making-sense-harness-engineering-henrique-bastos-ezotf)

![Image 66](https://static.licdn.com/aero-v1/sc/h/5k9cgtx8rhoyqkcxfoncu1svl)
## Join now to view more content

Create your free account or sign in to continue your search

 Email or phone  

 Password  

Show

[Forgot password?](https://www.linkedin.com/uas/request-password-reset?trk=csm-v2_forgot_password) Sign in 

[Join with email](https://www.linkedin.com/signup/cold-join?session_redirect=%2Fpulse%2Fmaking-sense-harness-engineering-henrique-bastos-ezotf&trk=pulse-article_contextual-sign-in-modal_join-with-email-cta)

or

Already on LinkedIn? [Sign in](https://www.linkedin.com/login?trk=pulse-article_contextual-sign-in-modal_sign-in-link)

By clicking Continue to join or sign in, you agree to LinkedIn’s [User Agreement](https://www.linkedin.com/legal/user-agreement?trk=linkedin-tc_auth-button_user-agreement), [Privacy Policy](https://www.linkedin.com/legal/privacy-policy?trk=linkedin-tc_auth-button_privacy-policy), and [Cookie Policy](https://www.linkedin.com/legal/cookie-policy?trk=linkedin-tc_auth-button_cookie-policy).
