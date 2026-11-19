$w = [Activator]::CreateInstance([Type]::GetTypeFromProgID("Word.Application"))
$w.Visible = $false
$w.DisplayAlerts = 0

$buildDir = "C:\Users\vegit\Downloads\Event-Management-System\.build_reports"
$repoDir = "C:\Users\vegit\Downloads\Event-Management-System"

$targets = @(
    @{ docx = "SAD_Template.docx"; pdf = "SAD_Template.pdf"; alias = "SAD.pdf" },
    @{ docx = "SRS_Template for SE.docx"; pdf = "SRS_Template for SE.pdf"; alias = "SRS.pdf" },
    @{ docx = "Test_Plan_Template for SE.docx"; pdf = "Test_Plan_Template for SE.pdf"; alias = "Test_Plan.pdf" }
)

foreach ($item in $targets) {
    $srcDocx = "$buildDir\$($item.docx)"
    $dstPdf = "$repoDir\$($item.pdf)"
    $aliasPdf = "$repoDir\$($item.alias)"

    Write-Host "Converting $srcDocx ..."
    $doc = $w.Documents.Open($srcDocx)
    $pdfRef = [string]$dstPdf
    $doc.SaveAs([ref]$pdfRef, [ref]17)
    $doc.Close([ref]0)

    Copy-Item $dstPdf $aliasPdf -Force
    Copy-Item $dstPdf "$repoDir\docs\$($item.pdf)" -Force
    Copy-Item $dstPdf "$repoDir\docs\$($item.alias)" -Force
    Copy-Item $dstPdf "$repoDir\documents\$($item.pdf)" -Force
    Copy-Item $dstPdf "$repoDir\documents\$($item.alias)" -Force

    Write-Host "Success: $dstPdf"
}

$w.Quit([ref]0)
Write-Host "DONE"
