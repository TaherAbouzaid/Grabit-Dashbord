import { Component, OnInit } from '@angular/core';
// import { ImportsModule } from './imports';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
// import { Editor } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
// import { NgModule } from '@angular/core';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';

import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface UploadEvent {
  originalEvent: Event;
  files: File[];
}

@Component({
  selector: 'app-Test',
  templateUrl: './Test.component.html',
  standalone: true,
  styleUrls: ['./Test.component.css'],
  imports: [ReactiveFormsModule, CommonModule, EditorModule, ButtonModule, FormsModule,FileUpload, ToastModule],
  providers: [MessageService]

})


export class TestComponent implements OnInit {
  // constructor(private messageService: MessageService) {}

  // onUpload(event: UploadEvent) {
  //     this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded with Basic Mode' });
  // }
  formGroup!: FormGroup;
  text: any;




    ngOnInit() {
        this.formGroup = new FormGroup({
            text: new FormControl()
        });
    }
}

