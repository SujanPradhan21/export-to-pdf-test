import { Component } from '@angular/core';
import { SavePdfService } from 'src/app/services/save-pdf.service';

@Component({
  selector: 'app-export-file',
  templateUrl: './export-file.component.html',
  styleUrls: ['./export-file.component.css'],
})
export class ExportFileComponent {
  constructor(private pdfService: SavePdfService) {}
  ngOnInit() {
    // this.saveAsPDF();
  }
  saveAsPDF() {
    const content = document.getElementById('pdf-content');
    if (content) {
      try {
        this.pdfService.generatePDF(content as HTMLElement, {
          filename: 'report.pdf',
          logoUrl: 'assets/cover_logo.png',
          footerLogoUrl: 'assets/footer.png',
          headerText: 'Comprehensive Dummy Report',
          showHeaderOn: 'first',
          showFooterOn: 'all',
        });
        console.log('PDF generated successfully');
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  }
}
