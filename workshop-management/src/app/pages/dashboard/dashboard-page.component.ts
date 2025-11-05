import { Component, OnInit } from '@angular/core';
import { DashboardSummary } from '../../models/service-order.models';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit {
  summary?: DashboardSummary;
  loading = false;
  error?: string;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchSummary();
  }

  fetchSummary(): void {
    this.loading = true;
    this.error = undefined;
    this.apiService.getDashboard().subscribe({
      next: summary => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar o painel no momento.';
        this.loading = false;
      }
    });
  }

  formatStatus(status: string): string {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }
}
