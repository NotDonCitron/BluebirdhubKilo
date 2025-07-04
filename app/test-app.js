const puppeteer = require('puppeteer');

async function testApp() {
    console.log('🧪 Testing AppFlowy Clone Application...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Track console messages and errors
        const logs = [];
        const errors = [];
        
        page.on('console', (msg) => {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        });
        
        page.on('pageerror', (error) => {
            errors.push(`JavaScript Error: ${error.message}`);
        });
        
        page.on('requestfailed', (request) => {
            errors.push(`Failed Request: ${request.url()} - ${request.failure().errorText}`);
        });
        
        console.log('🌐 Navigating to http://localhost:3000...');
        
        const response = await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log(`📊 Response Status: ${response.status()}`);
        console.log(`📄 Response Headers: ${JSON.stringify(response.headers(), null, 2)}`);
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get page information
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                bodyText: document.body.innerText.substring(0, 500),
                hasLandingContent: document.body.innerText.includes('Productivity Workspace'),
                hasSignInButton: !!document.querySelector('a[href="/login"]'),
                errorCount: document.querySelectorAll('.error, [data-testid="error"]').length,
                loadedScripts: [...document.querySelectorAll('script[src]')].length,
                loadedStyles: [...document.querySelectorAll('link[rel="stylesheet"]')].length
            };
        });
        
        console.log('\n📊 Page Analysis:');
        console.log(`   Title: "${pageInfo.title}"`);
        console.log(`   URL: ${pageInfo.url}`);
        console.log(`   Has Landing Content: ${pageInfo.hasLandingContent}`);
        console.log(`   Has Sign In Button: ${pageInfo.hasSignInButton}`);
        console.log(`   Error Elements: ${pageInfo.errorCount}`);
        console.log(`   Loaded Scripts: ${pageInfo.loadedScripts}`);
        console.log(`   Loaded Styles: ${pageInfo.loadedStyles}`);
        
        console.log('\n📝 Content Preview:');
        console.log(`   "${pageInfo.bodyText}"`);
        
        // Test login page
        console.log('\n🔗 Testing login page...');
        try {
            await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
            const loginTitle = await page.title();
            console.log(`   Login page title: "${loginTitle}"`);
        } catch (loginError) {
            console.log(`   ❌ Login page error: ${loginError.message}`);
        }
        
        // Test dashboard redirect (should redirect to login)
        console.log('\n🏢 Testing dashboard access...');
        try {
            await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
            const dashboardUrl = page.url();
            console.log(`   Dashboard redirected to: ${dashboardUrl}`);
        } catch (dashboardError) {
            console.log(`   ❌ Dashboard test error: ${dashboardError.message}`);
        }
        
        // Summary
        console.log('\n📋 Test Summary:');
        console.log(`   Console Messages: ${logs.length}`);
        console.log(`   JavaScript Errors: ${errors.length}`);
        console.log(`   Status: ${pageInfo.hasLandingContent ? '✅ WORKING' : '❌ ISSUES DETECTED'}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Errors Found:');
            errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
        }
        
        if (logs.length > 0) {
            console.log('\n📝 Console Logs:');
            logs.slice(0, 10).forEach((log, i) => console.log(`   ${i + 1}. ${log}`));
            if (logs.length > 10) {
                console.log(`   ... and ${logs.length - 10} more messages`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testApp().catch(console.error); 