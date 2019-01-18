import React from 'react';
import styled from '@emotion/styled';

import './App.css';
import './normalize.css';

interface UserId {
	id: number;
}

interface UserData {
	firstname: string;
	lastname: string;
}

type User = UserId & UserData;

interface Ticket {
	id: string;
	name: string;
	url?: string;
}

interface TaskId {
	id: number;
}

type TaskState = 'open' | 'waiting' | 'work_in_progress' | 'finished' | 'cancelled';

interface TaskData {
	name: string;
	description?: string;
	state: TaskState;
	ticket_reference?: Ticket;
	deadline?: Date;
	parents?: TaskId[];
	children?: TaskId[];
	employer?: User[];
	worker?: User[];
}

type Task = TaskId & TaskData;

let tasks: Task[] = [
	{
		id: 1,
		state: 'open',
		name: 'task1'
	},
	{
		id: 2,
		state: 'open',
		name: 'task2',
		parents: [{ id: 1 }]
	},
	{
		id: 3,
		state: 'open',
		name: 'task3',
		parents: [{ id: 1 }]
	},
	{
		id: 4,
		state: 'open',
		name: 'task4',
		parents: [{ id: 2 }, { id: 1 }]
	},
	{
		id: 5,
		state: 'finished',
		name: 'task5'
	}
];

interface Properties {}

interface AppState {}

const styles = {
	color: 'firebrick',
	backgroundColor: 'lavender'
};

const Container = styled.div(styles);

interface TaskListProperties {
	parent_task?: TaskId;
	tasks: Task[];
}

const TaskOList = styled.ol({
	padding: 0,
	margin: 0
});

const TaskListItem = styled.li({
	padding: 0,
	margin: 0
});

const changeState = (task_id: number, state: TaskState) => {
	const old_tasks = tasks;
	tasks = [
		...tasks.map((current_task: Task) => {
			if (current_task.id === task_id) {
				console.log('found', task_id);
				return { ...current_task, state };
			} else {
				return current_task;
			}
		})
	];
	console.log('change state', old_tasks === tasks);
};

const TaskList: React.StatelessComponent<TaskListProperties> = (props: TaskListProperties) => {
	const task_list = props.tasks.filter((task: Task) => {
		if (props.parent_task) {
			return (
				task.parents &&
				task.parents.find(t => typeof props.parent_task !== 'undefined' && t.id === props.parent_task.id)
			);
		} else {
			return typeof task.parents === 'undefined' || task.parents.length === 0;
		}
	});

	console.log('tasklist', task_list);
	return (
		<TaskOList>
			{task_list.map((task: Task, index: number) => {
				return (
					<TaskListItem key={task.id}>
						<input
							type="checkbox"
							checked={task.state === 'finished'}
							onChange={() => {
								changeState(task.id, 'finished');
							}}
						/>
						<strong>{task.name}</strong>
						<TaskList tasks={props.tasks} parent_task={task} />
					</TaskListItem>
				);
			})}
		</TaskOList>
	);
};

class App extends React.PureComponent<Properties, AppState> {
	public render() {
		return (
			<Container>
				<header>
					<h1>List of all your tasks</h1>
				</header>

				<TaskList tasks={tasks} />
			</Container>
		);
	}
}

export default App;
