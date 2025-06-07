const fs = require('fs');
const path = require('path');

// Generate color based on coverage percentage
function getColor(percentage) {
    if (percentage >= 80) return 'brightgreen';
    if (percentage >= 70) return 'green';
    if (percentage >= 60) return 'yellowgreen';
    if (percentage >= 50) return 'yellow';
    if (percentage >= 40) return 'orange';
    return 'red';
}

// Generate coverage badge data
function generateCoverageBadge() {
    try {
        // Read coverage summary
        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
        
        if (!fs.existsSync(coveragePath)) {
            console.log('📊 No coverage data found. Run tests with coverage first.');
            return;
        }
        
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const summary = coverageData.total;
        
        // Generate coverage report
        const report = {
            statements: Math.round(summary.statements.pct),
            branches: Math.round(summary.branches.pct),
            functions: Math.round(summary.functions.pct),
            lines: Math.round(summary.lines.pct)
        };
        
        console.log('📊 Coverage Report:');
        console.log(`   Statements: ${report.statements}%`);
        console.log(`   Branches: ${report.branches}%`);
        console.log(`   Functions: ${report.functions}%`);
        console.log(`   Lines: ${report.lines}%`);
        
        // Generate shield URLs for badges
        const overallCoverage = Math.round((report.statements + report.branches + report.functions + report.lines) / 4);
        const badges = {
            overall: `https://img.shields.io/badge/coverage-${overallCoverage}%25-${getColor(overallCoverage)}`,
            statements: `https://img.shields.io/badge/statements-${report.statements}%25-${getColor(report.statements)}`,
            branches: `https://img.shields.io/badge/branches-${report.branches}%25-${getColor(report.branches)}`,
            functions: `https://img.shields.io/badge/functions-${report.functions}%25-${getColor(report.functions)}`,
            lines: `https://img.shields.io/badge/lines-${report.lines}%25-${getColor(report.lines)}`
        };
        
        console.log('\n🏷️  Coverage Badges:');
        console.log(`   Overall: ![Coverage](${badges.overall})`);
        console.log(`   Statements: ![Statements](${badges.statements})`);
        console.log(`   Branches: ![Branches](${badges.branches})`);
        console.log(`   Functions: ![Functions](${badges.functions})`);
        console.log(`   Lines: ![Lines](${badges.lines})`);
        
        // Write badge data to file
        const badgeData = {
            timestamp: new Date().toISOString(),
            coverage: report,
            badges: badges,
            overall: overallCoverage
        };
        
        const badgeFilePath = path.join(process.cwd(), 'coverage', 'badge-data.json');
        fs.writeFileSync(badgeFilePath, JSON.stringify(badgeData, null, 2));
        
        console.log(`\n✅ Coverage badge data saved to: ${badgeFilePath}`);
        
        return badgeData;
        
    } catch (error) {
        console.error('❌ Error generating coverage badge:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateCoverageBadge();
}

module.exports = { generateCoverageBadge }; 