import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {PreferencesService} from '../../_service/preferences.service';
import {BackendService} from '../../_service/backend.service';
import {ActivatedRoute, Router} from '@angular/router';
import {forkJoin} from 'rxjs';
import {ModalService} from '../../_service/modal.service';

@Component({
    selector: 'app-endpoint-history',
    templateUrl: './endpoint-history.component.html',
})

export class EndpointHistoryComponent implements OnInit {
    tabs: any;
    endpoint: any;
    endpointStatus = '';
    fabricDetails = '';
    staleoffsubnetDetails = '';
    modalTitle = '';
    modalBody = '';
    modalIcon = 'error';
    fabricName: string;
    vnid: string;
    address: string;
    clearEndpointOptions: any;
    clearNodes = [];
    loading = true;
    dropdownActive: false;
    decisionBox = false;
    @ViewChild('errorMsg') msgModal: TemplateRef<any>;
    @ViewChild('clearMsg') clearModal: TemplateRef<any>;
    addNodes = (term) => {
        return {label: term, value: term};
    };

    constructor(private prefs: PreferencesService, private backendService: BackendService, private activatedRoute: ActivatedRoute,
                private router: Router, public modalService: ModalService) {
        this.clearEndpointOptions = [
            {label: 'Select all', value: 0},
            {label: 'Offsubnet endpoints', value: 1},
            {label: 'Stale Endpoints', value: 2}
        ];
        this.tabs = [
            {name: ' Local Learns', icon: 'icon-computer', path: 'locallearns'},
            {name: ' Per Node History', icon: 'icon-clock', path: 'pernodehistory'},
            {name: ' Move Events', path: 'moveevents', icon: 'icon-panel-shift-right'},
            {name: ' Off-Subnet Events', path: 'offsubnetevents', icon: 'icon-jump-out'},
            {name: ' Stale Events', path: 'staleevents', icon: 'icon-warning'}
        ];
    }

    ngOnInit() {
        this.loading = true;
        this.activatedRoute.parent.paramMap.subscribe(params => {
            this.fabricName = params.get('fabric');
            if (this.fabricName != undefined) {
                this.activatedRoute.paramMap.subscribe(params => {
                    this.vnid = params.get('vnid');
                    this.address = params.get('address');
                    this.getEndpoint(this.fabricName, this.vnid, this.address);
                    this.loading = false;
                }, error => {
                    this.loading = false;
                });
            }

        }, error => {
            this.loading = false;
        });
    }

    getEventProperties(property) {
        if (this.endpoint.events.length > 0) {
            return this.endpoint.events[0][property];
        } else if (this.endpoint.hasOwnProperty('first_learn')) {
            return this.endpoint.first_learn[property];
        } else {
            return '';
        }
    }

    setupStatusAndInfoStrings() {
        const status = this.getEventProperties('status');
        const node = this.getEventProperties('node');
        const intf = this.getEventProperties('intf_name');
        const encap = this.getEventProperties('encap');
        const epgname = this.getEventProperties('epg_name');
        const vrfbd = this.getEventProperties('vnid_name');
        this.staleoffsubnetDetails = '';
        if (this.endpoint.is_offsubnet) {
            this.staleoffsubnetDetails += 'Currently offsubnet on node ' + node + '\n';
        }
        if (this.endpoint.is_stale) {
            this.staleoffsubnetDetails += 'Currently stale on node ' + node;
            const currentlyOffsubnet = this.backendService.offsubnetStaleEndpointHistory(this.fabricName, this.vnid, this.address, 'is_offsubnet', 'endpoint');
            const currentlyStale = this.backendService.offsubnetStaleEndpointHistory(this.fabricName, this.vnid, this.address, 'is_stale', 'endpoint');
            const offsubnetHistory = this.backendService.offsubnetStaleEndpointHistory(this.fabricName, this.vnid, this.address, 'is_offsubnet', 'history');
            const staleHistory = this.backendService.offsubnetStaleEndpointHistory(this.fabricName, this.vnid, this.address, 'is_stale', 'history');
            forkJoin([currentlyOffsubnet, currentlyStale, offsubnetHistory, staleHistory]).subscribe(
                (data) => {
                    debugger;
                },
                (error) => {
                    debugger;
                }
            )
        }
        if (status === 'deleted') {
            this.endpointStatus = 'Not currently present in the fabric';
        } else {
            this.endpointStatus = 'Local on node ' + node;
            if (node > 0xffff) {
                const nodeA = (node & 0xffff0000) >> 16;
                const nodeB = (node & 0x0000ffff);
                this.endpointStatus = 'Local on node (' + nodeA + ',' + nodeB + ')';
            }
            if (intf !== '') {
                this.endpointStatus += ', interface ' + intf;
            }
            if (encap !== '') {
                this.endpointStatus += ', encap ' + encap;
            }
            if (epgname !== '') {
                this.endpointStatus += ', epg ' + epgname
            }
        }
        this.fabricDetails = 'Fabric ' + this.endpoint.fabric;
        if (this.endpoint.type === 'ipv4' || this.endpoint.type === 'ipv6') {
            this.fabricDetails += ', VRF '
        } else {
            this.fabricDetails += ', BD ';
        }
        this.fabricDetails += vrfbd + ', VNID ' + this.endpoint.vnid;
    }

    onClickOfDelete() {
        const msg = 'Are you sure you want to delete all information for ' + this.endpoint.addr + ' from the local database? Note, this will not affect the endpoint state within the fabric.'
        this.openModal('info', 'Wait', msg, this.msgModal, true, this.deleteEndpoint);
    }

    deleteEndpoint() {
        this.backendService.deleteEndpoint(this.fabricName, this.vnid, this.address).subscribe(
            (data) => {
                const msg = 'Endpoint deleted successfully';
                this.openModal('success', 'Success', msg, this.msgModal);
            },
            (error) => {
                const msg = 'Could not delete endpoint! ' + error['error']['error'];
                this.openModal('error', 'Error', msg, this.msgModal);
            }
        )
    }

    getEndpoint(fabric, vnid, address) {
        this.loading = true;
        this.backendService.getEndpoint(fabric, vnid, address).subscribe(
            (data) => {
                this.endpoint = data.objects[0]['ept.endpoint'];
                this.prefs.selectedEndpoint = this.endpoint;
                this.setupStatusAndInfoStrings();
                this.loading = false;
            },
            (error) => {
                const msg = 'Failed to load endpoint';
                this.openModal('error', 'Error', msg, this.msgModal);
            }
        );
    }

    public refresh() {
        this.backendService.dataplaneRefresh(this.fabricName, this.endpoint.vnid, this.endpoint.addr).subscribe(
            (data) => {

            },
            (error) => {

            }
        )
    }

    onClickOfRefresh() {
        const msg = 'Are you sure you want to force a refresh of' + this.address + '? This operation may take longer than expected';
        this.openModal('info', 'Wait', msg, this.msgModal, true, this.refresh);
    }

    public clearEndpoints() {
        return this.endpoint.type.toUpperCase();
    }

    openModal(modalIcon, modalTitle, modalBody, modalRef: TemplateRef<any>, decisionBox = false, callback = undefined) {
        this.modalIcon = modalIcon;
        this.modalTitle = modalTitle;
        this.modalBody = modalBody;
        this.decisionBox = decisionBox;
        this['callback'] = callback;
        this.modalService.openModal(modalRef);
    }
}
