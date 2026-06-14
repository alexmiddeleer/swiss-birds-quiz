Wikimedia rules

As of February 15, 2010, Wikimedia sites require a HTTP User-Agent header for all requests. This was an operative decision made by the technical staff and was announced and discussed on the technical mailing list.[1][2] The rationale is, that clients that do not send a User-Agent string are mostly ill behaved scripts that cause a lot of load on the servers, without benefiting the projects. User-Agent strings that begin with non-descriptive default values, such as python-requests/x, may also be blocked from Wikimedia sites (or parts of a website, e.g. api.php).

Requests (e.g. from browsers or scripts) that do not send a descriptive User-Agent header, may encounter an error message like this:

    Scripts should use an informative User-Agent string with contact information, or they may be blocked without notice.

Requests from disallowed user agents may instead encounter a less helpful error message like this:

    Our servers are currently experiencing a technical problem. Please try again in a few minutes.

This change is most likely to affect scripts (bots) accessing Wikimedia websites such as Wikipedia automatically, via api.php or otherwise, and command line programs.[3] If you operate a bot, please send a User-Agent header identifying the bot in a way that isn't going to be confused with many other bots, and supplying some way of contacting you, the operator, in accordance with the API Usage Guidelines. The contact information should be given as an email address, a website, or a wiki user using the format (<project>; User:<name>), e.g. (wikipedia:de; User:DuesenBot). For example:

User-Agent: CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org) generic-library/0.0

The generic format is <client name>/<version> (<contact information>) <library/framework name>/<version> [<library name>/<version> ...]. Parts that are not applicable can be omitted.

If you run an automated agent, please consider following the Internet-wide convention of including the string "bot" in the User-Agent string, in any combination of lowercase or uppercase letters. This is recognized by Wikimedia's systems, and used to classify traffic and provide more accurate statistics.

Do not copy a browser's user agent for your bot, as bot-like behavior with a browser's user agent will be assumed malicious.[4] Do not use generic agents such as "curl", "lwp", "Python-urllib", and so on. For large frameworks like pywikibot, there are so many users that just "pywikibot" is likely to be somewhat vague. Including detail about the specific task/script/etc would be a good idea, even if that detail is opaque to anyone besides the operator.[5]

Web browsers generally send a User-Agent string automatically; if you encounter the above error, please refer to your browser's manual to find out how to set the User-Agent string. Note that some plugins or proxies for privacy enhancement may suppress this header. However, for anonymous surfing, it is recommended to send a generic User-Agent string, instead of suppressing it or sending an empty string. Note that other features are much more likely to identify you to a website — if you are interested in protecting your privacy, visit the Cover Your Tracks project.

Browser-based applications written in JavaScript are typically forced to send the same User-Agent header as the browser that hosts them. This is not a violation of policy, however such applications are encouraged to include the Api-User-Agent header to supply an appropriate agent.

As of 2015, Wikimedia sites do not reject all page views and API requests from clients that do not set a User-Agent header. As such, the requirement is not automatically enforced. Rather, it may be enforced in specific cases as needed.[6]
Code examples

On Wikimedia wikis, if you don't supply a User-Agent header, or you supply an empty or generic one, your request will fail with an HTTP 403 error. Other MediaWiki installations may have similar policies.
JavaScript

If you are calling the API from browser-based JavaScript, you won't be able to influence the User-Agent header: the browser will use its own. To work around this, use the Api-User-Agent header and indicate the feature, user script or gadget that is making the call, ideally including a link to the source code:

// Using XMLHttpRequest
xhr.setRequestHeader( 'Api-User-Agent', 'Example/1.0' );

// Using jQuery
$.ajax( {
    url: 'https://example/...',
    data: ...,
    dataType: 'json',
    type: 'GET',
    headers: { 'Api-User-Agent': 'Example/1.0' },
} ).then( function ( data )  {
    // ..
} );

// Using mw.Api
var api = new mw.Api( {
    userAgent: 'Example/1.0'
} );
api.get( ... ).then( function ( data ) {
    // ...
});

// Using Fetch
fetch( 'https://example/...', {
    method: 'GET',
    headers: new Headers( {
        'Api-User-Agent': 'Example/1.0'
    } )
} ).then( function ( response ) {
    return response.json();
} ).then( function ( data ) {
    // ...
});

PHP

In PHP, you can identify your user-agent with code such as this:

ini_set( 'user_agent', 'CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org)' );

cURL

Or if you use cURL:

curl_setopt( $curl, CURLOPT_USERAGENT, 'CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org)' );

Python

In Python, you can use the Requests library to set a header:

import requests

url = 'https://example/...'
headers = {'User-Agent': 'CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org)'}

response = requests.get(url, headers=headers)

Or, if you want to use SPARQLWrapper like in https://people.wikimedia.org/~bearloga/notes/wdqs-python.html:

from SPARQLWrapper import SPARQLWrapper, JSON

url = 'https://example/...'
user_agent = 'CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org)'

sparql = SPARQLWrapper(url, agent = user_agent )
results = sparql.query()

Robot policy
As an Operator of a program automatically consuming the content of the wikis (robot), certain rules apply which depend on the type of content you’re accessing and how you access it. Bots that don't follow these guidelines may be rate-limited and informed of the reason, and pointed to ways to request higher quotas or exemptions.

Please note: while the guidelines apply to any bot that connects to our environment, rate limiting is not enforced on bots in Toolforge.
Bots that repeatedly try to get around these guidelines or rate limits, and/or threaten the stability of the sites may be blocked.
The following rules are an evolution of the previous version of this policy which was originally published in 2009. The updates include coverage of more systems, better defined limits, and clarifications to help any Bot Operator who acts in good faith to limit their impact on our systems.
Generally applicable rules

The following rules apply to any activity on our websites; rules in the following sections will be specific to sites/URLs instead.

    Consider if dumps are more efficient than live requests. Check if you can use Wikimedia Dumps or other forms of offline collection of our data instead of making live requests. If dumps are a viable option for your use case it will reduce the strain on our very limited resources and make your life easier.
    Accurately identify your User-Agent. Always identify your bot clearly via its User-Agent HTTP header by following the Wikimedia Foundation User-Agent Policy.
    When you are making a significant number of requests avoid user-agent impersonation and possible collateral damage blocks by either:
        Provide a URL where we can download a JSON formatted list of CIDRs from which your requests will originate. See the "what to do if the limits are too strict for me" section.
        Authenticate your requests using an on-wiki account when you are making API requests. An OAuth 2.0 access token is the preferred authentication method, but session cookies are also supported.
    Honor Robots.txt. Honor every directive in our robots.txt file.
    Default to gzip. Always request content with an Accept-Encoding: gzip HTTP header to reduce bandwidth usage. This is not necessary when you are directly requesting media files (i.e. images or video) which are already in a compressed format.
    Respect our HTTP status codes. When we reply with a 429 Too Many Requests status code respect the delay specified by the Retry-After header sent with the response.
    Cached interfaces are preferred and more efficient. If you need the HTML content of pages use either the /wiki/Article_name URL or the corresponding Wikimedia REST API /api/rest_v1/page/html/Article_name endpoint. These requests will be cheaper for us and faster for you because they can be cached in our content delivery network. More information about these request methods can be found below.

Website rules

    i.e. https://en.wikipedia.org/wiki/Main_Page

    Always crawl the website via the /wiki/Article_name URLs, with no query parameters. This will ensure that if the content is CDN-cached, you’ll get a faster response allowing you to crawl the site faster and more efficiently.
    If you're making read requests, do not emulate a browser - do not store cookies or execute javascript, unless you're not crawling the sites at high volume (so, more than 5 requests per second).
    Assuming you are following all of our best practices ideally, still ensure that the maximum concurrent number of requests is fewer than 10 overall, and keep the average requests per second below 20.
    Avoid accessing content that is not current, or via non-canonical URLs: do not crawl the site using the oldId or curid parameters, and only use the /wiki/Title format URLs.

API rules

All activity is subject to cross-API rate limiting that is global for all Wikimedia sites. See the documentation on rate limits for full details and best practices. In summary:

    API rate limits take into account client identity to determine the level of access.
    Stronger forms of identification result in a higher limit, such as running in Wikimedia Cloud Services (WMCS) or authenticating requests.
    The highest limits require running in WMCS, community bot approval, or being well-known to the Wikimedia Foundation.
    Further limits or additional best practices may apply to specific APIs.

REST API rules

    i.e. https://en.wikipedia.org/api/…

    You can use this interface to fetch the HTML content of the pages, or their summary.
    If unauthenticated, keep the concurrency of your requests to 3 at a time, and below 5 requests per second overall.
    If authenticated, you can raise the number of requests per second to 10.
    Avoid accessing content that is not current, so avoid requesting a specific revision in your URL.

Action API rules

    i.e. https://en.wikipedia.org/w/api.php?…

    Avoid using the action API for HTML content of pages. Use the website and/or the REST API instead.
    If unauthenticated, keep the concurrency of your requests to 1 at a time, and below 5 requests per second overall.
    If authenticated, you can raise the concurrency to 3 overall, and the number of requests per second to 10.
    Avoid using expensive API endpoints: if your request takes more than 1 second to serve, please wait 5 seconds before making another request.
    Where supported, use batch requests.

Media API rules

    i.e. https://upload.wikimedia.org/…

    Always keep a total concurrency of at most 2, and limit your total download speed to 25 Mbps (as measured over 10 second intervals).
    Only use originals or one of our standard thumbnail sizes, which you can see in mediawiki.org.
    Prefer thumbnails to downloading of originals if possible.

Rules for other resources

    i.e. Gerrit, GitLab, Phabricator, and other wikimedia.org services.

    Always keep a total concurrency of at most 1, and use a delay between requests of at least 1 second.
    Pause crawling for at least 15 minutes if you receive a 5xx status code.

What to do if these limits are too strict for me?

These limits are not per-domain but global for all Wikimedia properties, with an exception for community projects of the kind which would be eligible to run in Wikimedia Foundation’s hosted infrastructure (Wikimedia Cloud Services offerings).

Specifically, bots running in Toolforge and in any other Wikimedia Cloud Services offering are explicitly exempted from such limits. We will still reserve the right to temporarily rate-limit or block individual bots that might be compromising the stability of the websites.

Community bots that need a higher volume of API requests should run in WMCS or authenticate and request the bot flag from your local wiki community. Community-approved bots get higher rate limits.

If you are an external entity and you need a higher volume of requests, you should use Wikimedia Enterprise APIs instead. This is the preferred choice for commercial, high-volume users of the APIs.

Bot operators who are unsure how to get the access they need can contact the Wikimedia Foundation at bot-traffic@wikimedia.org.
