import {Component, OnInit} from '@angular/core';
import {BackendService} from '../../_service/backend.service';
import {ActivatedRoute} from '@angular/router';
import {PagingService} from '../../_service/paging.service';

@Component({
    selector: 'app-cleared-ept',
    templateUrl: './cleared-ept.component.html'
})

export class ClearedEptComponent implements OnInit {
    rows: any;
    loading: any;
    sorts = [];

    constructor(private backendService: BackendService, private activatedRoute: ActivatedRoute, public pagingService: PagingService) {
    }

    ngOnInit() {
        this.activatedRoute.parent.paramMap.subscribe(params => {
            const fabricName = params.get('fabric');
            this.pagingService.fabricName = fabricName;
            if (fabricName != null) {
                this.getClearedEndpoints();
            }
        });
    }

    getClearedEndpoints() {
        this.backendService.getFilteredEndpoints(this.pagingService.fabricName, this.sorts, false, false, false, false, 'remediate', this.pagingService.pageOffset, this.pagingService.pageSize).subscribe(
            (data) => {
                this.pagingService.count = data['count'];
                this.rows = data['objects'];
                this.loading = false;
            }, (error) => {
                this.loading = false;
            }
        );
    }

    setPage(event) {
        this.pagingService.pageOffset = event.offset;
        this.getClearedEndpoints();
    }

    onSort(event) {
        this.sorts = event.sorts;
        this.getClearedEndpoints();
    }

}


