# Readiness checklist

Shown once per run, after setup and before any target is chosen. The user
sees one table per group, every row with a mark, and a short "Needs you"
list. Nothing in it is guessed: each row is the result of something you did
in this run (a tool call, a page you opened, a file you read).

## Marks

| Mark | Meaning | Right column says |
| --- | --- | --- |
| ✅ | verified now | the fact: names, counts, sizes, times |
| ⚠️ | works, but you assumed a default | what you will do unless told otherwise |
| ❌ | blocks some or all sites | what the user must provide |
| ➖ | not relevant this run | why, in a few words |

Every row gets exactly one mark. No "checking", no blank cell, no advice in
the right column (advice goes in "Needs you").

## Rows, in this order

Write the headings and rows in the user's language. Keep the groups and the
order fixed so the user learns where to look.

### Connection

| Row | ✅ when | otherwise |
| --- | --- | --- |
| MCP | `list_projects` answered; show plan and projects used / limit | ❌ auth error or tool missing (step 1 says what to tell the user) |
| Project | matched or created; show domain → project name | ❌ `possible_duplicate` or quota (ask) |
| Browser | a tab opened in the browser tool; show its name | ❌ no browser tool |

### Product profile

Heading carries `profile.json` and its `updatedAt`. Data comes from
`preflight.mjs --json` (`facts` and `errors` / `warnings`).

| Row | ✅ when | ⚠️ / ❌ |
| --- | --- | --- |
| Name / URL / tagline | all three present; show tagline length | ❌ any missing |
| Descriptions | short, medium and long present; show lengths | ⚠️ one missing (you will shorten the next longer one); ❌ none |
| Categories / pricing | both set; show them | ⚠️ categories empty (you will pick from the product page) |
| Logo | square logo ≥ 512 px; show size and whether a wide logo exists | ⚠️ no wide logo; ❌ no square logo or under 512 px |
| Screenshots | at least one file; show count | ❌ none (about a third of sites require one) |
| Contact email | present | ❌ missing |
| Submitter / founder name | present | ⚠️ missing (some launch sites ask) |
| Stale profile | `updatedAt` within 120 days | ⚠️ older (prices and copy may have changed) |

Preflight `errors` not covered above get their own ❌ row at the end of this
group, one per field. `warnings` become ⚠️ rows only when they will cost
sites; otherwise leave them out.

### Accounts and mail

| Row | ✅ when | ⚠️ / ❌ / ➖ |
| --- | --- | --- |
| Directory account | `allowRegistration` true, `accounts.default.email` and a password set; show the email (never the password) | ⚠️ email but no password (you will use the browser's Google session); ➖ `allowRegistration` false (account sites go to "needs your account") |
| Webmail | you opened the webmail tab and signed in; show the host and the age of the newest message | ❌ could not sign in (email-verify and account sites skipped); ➖ a mail tool is used instead (name it) |
| Google session | the browser's Google account matches `accounts.default.email` | ⚠️ a different account is signed in (sites with "Sign in with Google" would use it); ➖ password given and no Google login needed |

### Scope

| Row | ✅ when | ⚠️ |
| --- | --- | --- |
| Paid sites | `allowPaid` false → "free paths only"; true → "checkout handed to you" | never ⚠️; this is the profile's choice |
| CAPTCHA | `allowCaptchaHandoff` true → "handed to you, grouped at the end" | ➖ false (captcha sites skipped) |
| Link type | the user asked for dofollow only, or said both | ⚠️ not stated (you will take both) |
| Count / category | the user said how many and which category | ⚠️ not stated (default 10, all categories) |

### Follow-ups

From `project_status` with `followup` set, as in step 6.

| Row | ✅ when | ⚠️ |
| --- | --- | --- |
| Badges pending | 0 | ⚠️ n, with the domains |
| Email verifications pending | 0 | ⚠️ n, with the domains |
| Awaiting review over 7 days | any number; you re-check them first | never ⚠️ |

## Needs you

After the tables, one numbered list, "add" items first, then "confirm"
items, numbers running on. One line each: what, and where it goes.

- Every ❌ row produces an "add" item.
- Every ⚠️ row produces a "confirm" item that names the default.
- End with one sentence saying what happens next (below).

All ✅ and ➖: write "All set." and go straight to choosing targets.

Any ❌: stop after the checklist. Wait for the user, update the rows that
changed, show the checklist again (only if something was ❌), then continue.

Only ⚠️: do not wait. Choose targets, and put the target plan (step 8) in
the same message, under the checklist; its single go-ahead also covers the
confirm items. The user corrects a default in that reply, or says go.

## Into the report

Step 10 writes the same rows into `report.html` under `readiness`, so the
user can see what the run started from:

```json
"readiness": {
  "checkedAt": "2026-11-05 14:02",
  "rows": [
    { "group": "Connection", "item": "MCP", "mark": "pass", "result": "wheretosubmit.org, Lifetime, 3/99 projects" },
    { "group": "Product profile", "item": "Screenshots", "mark": "missing", "result": "none in assets/" }
  ]
}
```

`mark` is `pass`, `confirm`, `missing` or `na`. Never put a password, a
token or a verification code in a `result`.

## Example (Chinese user)

```
## 开跑前自检 · Scientific Figure

**连接**

| | 项目 | 结果 |
|---|---|---|
| ✅ | MCP 连接 | wheretosubmit.org，Lifetime，项目 3/99 |
| ✅ | 项目匹配 | scientificfigure.com → 已有项目，沿用 |
| ✅ | 浏览器 | ego-browser，新标签已打开 |

**产品资料** profile.json 2026-11-02

| | 项目 | 结果 |
|---|---|---|
| ✅ | 名称 / 网址 / 一句话介绍 | Scientific Figure · scientificfigure.com · 72 字符 |
| ✅ | 描述 3 种长度 | short 118 · medium 412 · long 1380 字符 |
| ✅ | 分类 / 定价 | AI tools, Design · Freemium，Pro $9/月 |
| ⚠️ | Logo | 512×512，缺宽版 |
| ❌ | 截图 | assets/ 里没有 |
| ✅ | 联系邮箱 | daidaohao3@163.com |
| ⚠️ | 创始人姓名 | 为空 |

**账号与邮箱**

| | 项目 | 结果 |
|---|---|---|
| ✅ | 目录站账号 | daidaohao3@163.com，密码已填，允许注册 |
| ✅ | 网页邮箱 | mail.163.com 已登录，最新一封 2 小时前 |
| ⚠️ | Google 登录 | 浏览器里是另一个 Google 账号 |

**本次范围**

| | 项目 | 结果 |
|---|---|---|
| ✅ | 付费站 | 只走免费通道 |
| ✅ | 验证码 | 交给你，攒到最后 |
| ⚠️ | 外链类型 | 未指定，dofollow 和 nofollow 都做 |
| ⚠️ | 数量 | 未指定，10 个，不限分类 |

**上次遗留**

| | 项目 | 结果 |
|---|---|---|
| ⚠️ | 待挂徽章 | 2 个：postmake.io、toolpilot.ai |
| ✅ | 待验证邮件 | 0 |
| ✅ | 待审核超 7 天 | 3 个，先复查 |

**需要你补充**
1. 放 1 到 3 张截图到 .wheretosubmit/assets/（1280×800 以上）

**需要你确认**
2. 创始人姓名，不填就跳过要它的站
3. Google 登录用浏览器里现有的账号
4. 外链类型都做
5. 10 个，不限分类
6. 2 个徽章这次跳过

补上 1 我就开跑；2 到 6 不说就按上面的默认。
```
